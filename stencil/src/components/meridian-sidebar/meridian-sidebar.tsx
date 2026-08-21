import { Component, Prop, State, Event, EventEmitter, Watch, h } from '@stencil/core';

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: string;
  active?: boolean;
}

/**
 * @component meridian-sidebar
 * @description Sidebar navigation component for the Meridian design system.
 * Consumes Meridian CSS custom properties from the host page so tokens
 * inherit across the shadow DOM boundary.
 *
 * @example
 * <meridian-sidebar
 *   sections='[{"title":"Websites","items":[{"id":"domains","label":"Domains","icon":"ri-global-line"}]}]'
 *   active-item="domains"
 * ></meridian-sidebar>
 */
@Component({
  tag: 'meridian-sidebar',
  styleUrl: 'meridian-sidebar.scss',
  shadow: true,
})
export class MeridianSidebar {
  /** Navigation sections as JSON string or object array. */
  @Prop() sections: string | NavSection[] = [];

  /** ID of the currently active nav item. */
  @Prop({ mutable: true, reflect: true }) activeItem?: string;

  /** Whether the sidebar is collapsed (icon-only mode). */
  @Prop({ mutable: true, reflect: true }) collapsed = false;

  /** Fired when a nav item is selected. */
  @Event() navItemSelected!: EventEmitter<NavItem>;

  /** Fired when collapse state changes. */
  @Event() collapseChanged!: EventEmitter<boolean>;

  @State() parsedSections: NavSection[] = [];

  @Watch('sections')
  parseSections(): void {
    if (typeof this.sections === 'string') {
      try {
        this.parsedSections = JSON.parse(this.sections);
      } catch {
        this.parsedSections = [];
      }
    } else {
      this.parsedSections = this.sections;
    }
  }

  componentWillLoad(): void {
    this.parseSections();
  }

  private handleItemClick(item: NavItem): void {
    this.activeItem = item.id;
    this.navItemSelected.emit(item);
  }

  private toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    this.collapseChanged.emit(this.collapsed);
  }

  render() {
    return (
      <nav
        class={{ sidebar: true, 'sidebar--collapsed': this.collapsed }}
        aria-label="Main navigation"
      >
        <div class="sidebar__header">
          <slot name="logo">
            <span class="sidebar__brand">cPanel</span>
          </slot>
          <button
            type="button"
            class="sidebar__collapse-btn"
            onClick={() => this.toggleCollapse()}
            aria-label={this.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={String(!this.collapsed)}
          >
            <i class={this.collapsed ? 'ri-menu-unfold-line' : 'ri-menu-fold-line'} aria-hidden="true"></i>
          </button>
        </div>

        <div class="sidebar__content">
          {this.parsedSections.map(section => (
            <div class="sidebar__section">
              {!this.collapsed && (
                <div class="sidebar__section-title">{section.title}</div>
              )}
              <ul class="sidebar__list" role="list">
                {section.items.map(item => (
                  <li role="listitem">
                    <button
                      type="button"
                      class={{
                        sidebar__item: true,
                        'sidebar__item--active': this.activeItem === item.id,
                      }}
                      onClick={() => this.handleItemClick(item)}
                      aria-current={this.activeItem === item.id ? 'page' : undefined}
                      title={this.collapsed ? item.label : undefined}
                    >
                      <i class={item.icon} aria-hidden="true"></i>
                      {!this.collapsed && (
                        <span class="sidebar__item-label">{item.label}</span>
                      )}
                      {!this.collapsed && item.badge && (
                        <span class="sidebar__item-badge">{item.badge}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div class="sidebar__footer">
          <slot name="footer"></slot>
        </div>
      </nav>
    );
  }
}
