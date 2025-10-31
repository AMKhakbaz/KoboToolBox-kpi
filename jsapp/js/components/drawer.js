import React, { lazy, Suspense } from 'react'

import { Button } from '@mantine/core'
import { observer } from 'mobx-react'
import autoBind from 'react-autobind'
import reactMixin from 'react-mixin'
import { NavLink } from 'react-router-dom'
import Reflux from 'reflux'
import bem from '#/bem'
import LibrarySidebar from '#/components/library/librarySidebar'
import HelpBubble from '#/components/support/helpBubble'
import envStore from '#/envStore'
import pageState from '#/pageState.store'
import RequireAuth from '#/router/requireAuth'
import { ROUTES } from '#/router/routerConstants'
import { COMMON_QUERIES, MODAL_TYPES } from '../constants'
import SidebarFormsList from '../lists/sidebarForms'
import mixins from '../mixins'
import { router, routerIsActive, withRouter } from '../router/legacy'
import { searches } from '../searches'
import sessionStore from '../stores/session'
import { useSession } from '../stores/useSession'
import { NAVIGATION_MODULES, ORGANIZATION_ONLY_TOOLTIP } from '#/navigation/modules.config'

const AccountSidebar = lazy(() => import('#/account/accountSidebar'))

const INITIAL_STATE = {
  headerFilters: 'forms',
  searchContext: searches.getSearchContext('forms', {
    filterParams: {
      assetType: COMMON_QUERIES.s,
    },
    filterTags: COMMON_QUERIES.s,
  }),
}

const FormSidebar = observer(
  class FormSidebar extends Reflux.Component {
    constructor(props) {
      super(props)
      this.state = Object.assign(
        {
          currentAssetId: false,
          files: [],
        },
        pageState.state,
      )
      this.state = Object.assign(INITIAL_STATE, this.state)

      this.unlisteners = []
      this.stores = [pageState]
      autoBind(this)
    }
    componentDidMount() {
      // NOTE: this causes multiple callbacks being fired when using hot reload
      // in dev environment. Unfortunately `router.subscribe` doesn't return
      // a cancel function, so we can't make it stop.
      // TODO: when refactoring this file, make sure not to use the legacy code.
      this.unlisteners.push(router.subscribe(this.onRouteChange.bind(this)))
    }
    componentWillUnmount() {
      this.unlisteners.forEach((clb) => {
        clb()
      })
    }
    newFormModal(evt) {
      evt.preventDefault()
      pageState.showModal({
        type: MODAL_TYPES.NEW_FORM,
      })
    }
    render() {
      return (
        <>
          <Button size='lg' fullWidth disabled={!sessionStore.isLoggedIn} onClick={this.newFormModal.bind(this)}>
            {t('new').toUpperCase()}
          </Button>

          <SidebarFormsList />
        </>
      )
    }
    onRouteChange() {
      this.setState(INITIAL_STATE)
    }
  },
)

reactMixin(FormSidebar.prototype, searches.common)
reactMixin(FormSidebar.prototype, mixins.droppable)

class DrawerLink extends React.Component {
  constructor(props) {
    super(props)
    autoBind(this)
  }
  onClick(evt) {
    if (this.props.disabled) {
      evt.preventDefault()
      return
    }
    if (!this.props.href) {
      evt.preventDefault()
    }
    if (this.props.onClick) {
      this.props.onClick(evt)
    }
  }
  render() {
    const icon = <i className={`k-icon-${this.props['k-icon']}`} />
    const tooltip = this.props.tooltip || this.props.label
    const ariaLabel = this.props['aria-label'] || this.props.label
    const classNames = [this.props.class, 'k-drawer__link']

    if (this.props.disabled) {
      classNames.push('k-drawer__link--disabled')
    }

    let link
    if (this.props.linkto && !this.props.disabled) {
      link = (
        <NavLink
          to={this.props.linkto}
          className={classNames.join(' ')}
          data-tip={tooltip}
          aria-label={ariaLabel}
          title={tooltip}
        >
          {icon}
        </NavLink>
      )
    } else if (this.props.linkto) {
      link = (
        <span
          className={classNames.join(' ')}
          data-tip={tooltip}
          aria-disabled='true'
          aria-label={ariaLabel}
          role='link'
          tabIndex={-1}
          title={tooltip}
        >
          {icon}
        </span>
      )
    } else {
      link = (
        <a
          href={this.props.href || '#'}
          className={classNames.join(' ')}
          onClick={this.onClick}
          data-tip={tooltip}
          aria-label={ariaLabel}
          title={tooltip}
        >
          {icon}
        </a>
      )
    }
    return link
  }
}

export const PrimaryNavigation = ({ accountType }) => {
  const isOrganizational = accountType === 'organizational'
  const orgOnlyTooltip = t(ORGANIZATION_ONLY_TOOLTIP)

  return (
    <bem.KDrawer__primaryIcons>
      {NAVIGATION_MODULES.map((module) => {
        const label = t(module.label)
        const disabled = module.requiresOrganizational && !isOrganizational
        const tooltip = disabled ? orgOnlyTooltip : label

        return (
          <DrawerLink
            key={module.id}
            label={label}
            linkto={module.route}
            k-icon={module.icon}
            disabled={disabled}
            tooltip={tooltip}
          />
        )
      })}
    </bem.KDrawer__primaryIcons>
  )
}

const Drawer = observer(
  class Drawer extends Reflux.Component {
    constructor(props) {
      super(props)
      autoBind(this)
      this.stores = [pageState]
    }

    isAccount() {
      return routerIsActive(ROUTES.ACCOUNT_ROOT)
    }

    render() {
      // no sidebar for not logged in users
      if (!sessionStore.isLoggedIn) {
        return null
      }

      return (
        <bem.KDrawer>
          <PrimaryNavigation accountType={this.props.accountType} />

          <bem.KDrawer__sidebar>
            {this.isLibrary() && (
              <bem.FormSidebarWrapper>
                <LibrarySidebar />
              </bem.FormSidebarWrapper>
            )}

            {this.isAccount() && (
              <Suspense fallback={null}>
                <RequireAuth>
                  <AccountSidebar />
                </RequireAuth>
              </Suspense>
            )}

            {!this.isLibrary() && !this.isAccount() && (
              <bem.FormSidebarWrapper>
                <FormSidebar />
              </bem.FormSidebarWrapper>
            )}
          </bem.KDrawer__sidebar>

          <bem.KDrawer__secondaryIcons>
            {sessionStore.isLoggedIn && <HelpBubble />}
            {envStore.isReady && envStore.data.source_code_url && (
              <a href={envStore.data.source_code_url} className='k-drawer__link' target='_blank' data-tip={t('Source')}>
                <i className='k-icon k-icon-logo-github' />
              </a>
            )}
          </bem.KDrawer__secondaryIcons>
        </bem.KDrawer>
      )
    }
  },
)

reactMixin(Drawer.prototype, searches.common)
reactMixin(Drawer.prototype, mixins.droppable)
reactMixin(Drawer.prototype, mixins.contextRouter)

const DrawerWithSession = (props) => {
  const { currentLoggedAccount } = useSession()
  const accountType = currentLoggedAccount && currentLoggedAccount.account_type

  return <Drawer {...props} accountType={accountType} />
}

export default withRouter(DrawerWithSession)
