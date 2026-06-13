import { render } from '@testing-library/react';
import DecorationSVG from '../DecorationSVG';

describe('DecorationSVG', () => {
  it.each([
    'cactus',
    'maidenhair-fern',
    'spider-plant',
    'monstera',
    'umbrella-tree',
  ] as const)('renders the %s plant with a brown pot', (plantVariant) => {
    const { container } = render(
      <svg>
        <DecorationSVG
          decoration={{
            id: `plant-${plantVariant}`,
            type: 'plant',
            plantVariant,
            x: 100,
            y: 100,
          }}
        />
      </svg>
    );

    expect(
      container.querySelector(`[data-plant-variant="${plantVariant}"]`)
    ).not.toBeNull();
    expect(
      container.querySelector('[data-base-size="plant-0.5"]')
    ).not.toBeNull();
    expect(container.querySelector('rect[fill="#7a5230"]')).not.toBeNull();
  });

  it('renders a light gray projector screen without a pull cord or foot', () => {
    const { container } = render(
      <svg>
        <DecorationSVG
          decoration={{ id: 'screen-1', type: 'projector-screen', x: 100, y: 100 }}
        />
      </svg>
    );

    expect(container.querySelector('rect[fill="#cfd1ce"]')).not.toBeNull();
    expect(container.querySelector('rect[width="3"][height="10"]')).toBeNull();
  });

  it('renders a speaker with a woofer', () => {
    const { container } = render(
      <svg>
        <DecorationSVG
          decoration={{ id: 'speaker-1', type: 'speaker', x: 100, y: 100 }}
        />
      </svg>
    );

    expect(container.querySelector('[data-speaker-driver="woofer"]')).not.toBeNull();
    expect(
      container.querySelector('[data-base-size="speaker-0.5"]')
    ).not.toBeNull();
  });

  it('applies scale to decorations other than the coffee table', () => {
    const { container } = render(
      <svg>
        <DecorationSVG
          decoration={{ id: 'lamp-1', type: 'floor-lamp', x: 100, y: 100, scale: 1.5 }}
        />
      </svg>
    );

    expect(
      container.querySelector('g[transform="translate(100,100) scale(1.5) translate(-100,-100)"]')
    ).not.toBeNull();
  });
});
