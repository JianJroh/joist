import { css, html, shadow, listen, tagName, attr } from '@joist/element';

export class CounterElement extends HTMLElement {
  @tagName static tagName = 'joist-counter';

  static observedAttributes = ['value'];

  @shadow styles = css`
    * {
      font-size: 200%;
    }

    :host {
      display: block;
    }

    slot {
      width: 4rem;
      display: inline-block;
      text-align: center;
    }

    button {
      width: 4rem;
      height: 4rem;
      border: none;
      border-radius: 10px;
      background-color: seagreen;
      color: white;
      cursor: pointer;
    }
  `;

  @shadow dom = html`
    <button id="dec">-</button>

    <slot></slot>

    <button id="inc">+</button>
  `;

  @attr accessor value = 0;

  attributeChangedCallback() {
    this.innerHTML = String(this.value);
  }

  @listen('click') onClick(e: Event) {
    const { id } = e.target as HTMLElement;

    switch (id) {
      case 'inc':
        this.value++;
        break;

      case 'dec':
        this.value--;
        break;
    }
  }
}
