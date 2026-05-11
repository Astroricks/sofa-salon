# Squeeze、候补与邮件说明

## 一、Squeeze（挤一挤）是怎么判定的？

### 当前逻辑

- **按「家具」设定，不是按整间房**：
  - 只有 **sofa** 和 **sofa-l** 可以挤人（chair / bench / cushion / floor 不能）。
  - 在 **Admin → Rooms → 点进某一间房间** 的编辑页里，**选中某个沙发**，右侧面板有 **「Squeeze extra」** 滑块（0 / 1 / 2），表示「这个沙发坐满后，还能再挤几个人」。
  - 默认：sofa 和 sofa-l 的 `squeezeExtra` 都是 1（即「can squeeze one more」）。

- **什么时候出现「挤一挤」位？**
  - 每个沙发**单独**判断：当**该沙发**的普通座位都有人占了（normal seats full），才会出现这块沙发对应的 squeeze 位（0～2 个，由你设的 `squeezeExtra` 决定）。
  - 例如：房间里有 2 个 sofa，每个 squeezeExtra=1。只有当一个 sofa 的座位全满时，那个 sofa 旁边才会出现 1 个「挤一挤」空位；另一个 sofa 没满就不会出现。

- **总容量**  
  - 普通座位总数 + 所有「可挤」家具的 `squeezeExtra` 之和 = 满员（含挤一挤）的总人数。  
  - 当「普通座 + 挤一挤座」都满了，就视为 **allFull**，用户会看到「加入候补」或「试试挤一挤」已满的提示。

### 你提到的「统一设置」建议

- **方案 A：在「设置房间」时选「Can squeeze one more / two more」**  
  当前其实已经是「在房间编辑里、按家具」设 squeeze。若你希望更简单，可以做成：  
  - 在**同一间房间的编辑页**加一个**房间级**选项，例如「满员后最多再挤几人」（0 / 1 / 2），保存时自动把房里所有可挤家具的 `squeezeExtra` 设成同一个值（或按比例分配）。这样不用每个沙发单独调。

- **方案 B：在「房间列表」页加一个全局设置**  
  在 Admin 的 **Rooms 列表页**（不点进任何一间房）加一个选项，例如「默认挤一挤人数：0 / 1 / 2」。  
  - 只对新创建的家具或新房间生效，或作为「批量应用」的默认值。  
  - 已有房间仍可进编辑页单独调每个沙发。

如果你确定要 A 或 B（或两个都要），可以再说，我可以按你的选择给出具体改法（在哪一页加什么选项、怎么写入数据库）。

---

## 二、Waitlist（候补）是怎么搞的？

### 什么时候能进候补？

- 当 **allFull** 时（普通座 + 挤一挤座都满），用户会看到「加入候补」按钮，可以点进去排队。
- 若还有 squeeze 空位，用户会先看到「挤一挤」位；只有连挤一挤都满了，才只能选候补。

### 候补有两种模式（每场活动在 Admin 里单独设）

1. **Auto（自动）**
   - 有人**取消**座位（或管理员删掉一个预约）→ 空出一个座位。
   - 系统自动把这张空位给**候补名单里排第一的人**：
     - 给他建一条 reservation；
     - 把他从 waitlist 里标记为 promoted；
     - 若他有邮箱，会发 **「You're in!」** 邮件（Resend 的 `sendWaitlistPromotion`）。
   - 所以：squeeze 满了 → 新人进候补；之后有人取消 → 候补第一人自动上位并收到邮件。

2. **Manual（手动）**
   - 同样会有人取消、空出座位，但**不会**自动给候补。
   - 管理员在 **Admin → 活动列表** 里，对那场活动点 **「Load waitlist」**，看到候补列表，再点某人的 **「Promote」**，并**选一个当前空着的座位**（可以是普通座或 squeeze 座），系统才会把那人升级成 reservation。
   - 适合你想自己决定「把空位给谁」的情况。

### 小结

- 满员（含 squeeze）→ 只能进候补。
- 有人取消 →  
  - Auto：自动给候补第一人 + 发邮件。  
  - Manual：管理员手动选人、选座位 promote。

---

## 三、发邮件（Reminder）和 Resend

### 现在已经有的

- **Resend** 已在项目里集成（`src/lib/email.ts`），用环境变量：
  - `RESEND_API_KEY`：在 Resend 后台拿 API Key。
  - `EMAIL_FROM`：发件人邮箱（例如用 Resend 验证过的域名下的地址）；不设则用 `onboarding@resend.dev`。
- 已经实现的邮件：
  1. **选座确认**（`sendConfirmation`）：用户选座成功后发「Seat confirmed」。
  2. **候补升级**（`sendWaitlistPromotion`）：Auto 模式下候补第一人上位时发「You're in!」。

### Reminder（提醒邮件）

- **函数已经写好**：`sendReminder` 在 `src/lib/email.ts` 里，参数是 `to, screeningTitle, screeningAt`，主题类似 "Reminder — xxx tomorrow"。
- **目前没有任何地方调用它**，所以不会自动发提醒。
- 要真的发 reminder，一般有两种做法：
  1. **定时任务（推荐）**  
     用 Vercel Cron、GitHub Actions、或别的 cron，每天（或每小时）跑一次：  
     - 查「明天」或「未来 24 小时内」的 screening；  
     - 对每场 screening 查所有 reservation 的用户邮箱；  
     - 对每个用户调一次 `sendReminder`。  
     需要你有一个能调到的 API 路由，例如 `GET /api/cron/send-reminders`（并做好鉴权，只允许 cron 调用）。
  2. **Admin 手动点「发提醒」**  
     在 Admin 某场活动的页面加一个按钮「Send reminder to all reserved」，点一下就对这场所有预约用户发一封 reminder。适合活动不多、不需要完全自动化的场景。

所以：**Reminder 是在 Resend 里发**（用同一个 `RESEND_API_KEY` 和 `EMAIL_FROM`），代码里已有 `sendReminder`，只差「什么时候触发」——要么 cron 调 API，要么 Admin 手动按钮。

---

## 四、邮件提醒（Resend）— 四种场景，直接发送

**Resend** 只负责发信；发不发、发给谁由我们代码决定。当前不做「用户勾选接收哪类邮件」，以下四种场景**有邮箱就发**：

1. **预订成功** — 选座成功后发确认邮件（`sendConfirmation`）
2. **取消预订** — 用户取消后发取消确认（`sendCancelConfirmation`）
3. **活动前一天/24 小时内** — 定时任务调 `GET /api/cron/event-reminders`，给有预约的用户发提醒（`sendReminder`）
4. **活动结束** — 定时任务调 `GET /api/cron/post-event-reminders`，给该场预约用户发「可去个人页打分」（`sendPostEventRatingReminder`）

另：**候补升级**时也会发「You're in!」给被 promote 的用户（`sendWaitlistPromotion`）。

### Cron 触发

- **活动提醒**：`GET /api/cron/event-reminders`，带 `Authorization: Bearer <CRON_SECRET>` 或 `?secret=<CRON_SECRET>`。给「未来 24 小时内」有预约的用户发提醒。
- **活动结束后打分**：`GET /api/cron/post-event-reminders`，同样带 `CRON_SECRET`。给「过去 24 小时内结束」的场次的预约用户发打分提醒。

在 `.env.local` 中设置 `CRON_SECRET` 后，用 Vercel Cron、GitHub Actions 等定时请求上述 URL 即可。

---

## 五、总结表

| 主题 | 当前行为 | 你可选的下一步 |
|------|----------|----------------|
| **Squeeze 几个** | 每个沙发在房间编辑里设 0/1/2（Squeeze extra） | 加房间级「满员后再挤几人」或房间列表的「默认挤几人」 |
| **候补** | 满员后可进候补；有人取消 → Auto 自动给第一人+发邮件，Manual 管理员手动 Promote | 无需改逻辑，只需在 Admin 把每场活动设成 Auto 或 Manual |
| **邮件** | 4 种场景 + 候补升级，有邮箱就发，无用户勾选 | 设置 `CRON_SECRET`，定时请求 event-reminders 与 post-event-reminders |

如果你决定要做「房间级 squeeze 选项」或「Reminder 触发方式」，告诉我你倾向的方案，我可以按现有代码结构写出具体改法（包括 API / 数据库 / Admin 文案）。
