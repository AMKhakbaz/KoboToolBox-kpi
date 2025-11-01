import React, { Suspense } from 'react'

import { Navigate, Outlet, Route, createHashRouter, createRoutesFromElements } from 'react-router-dom'
import accountRoutes from '#/account/routes'
import App from '#/app'
import { FormPage, LibraryAssetEditor } from '#/components/formEditors'
import LoadingSpinner from '#/components/common/loadingSpinner'
import AssetRoute from '#/components/library/assetRoute'
import MyLibraryRoute from '#/components/library/myLibraryRoute'
import PublicCollectionsRoute from '#/components/library/publicCollectionsRoute'
import { PERMISSIONS_CODENAMES } from '#/components/permissions/permConstants'
import processingRoutes from '#/components/processing/routes'
import projectsRoutes from '#/projects/routes'
import { NAVIGATION_MODULES } from '#/navigation/modules.config'
import PermProtectedRoute from '#/router/permProtectedRoute'
import { injectRouter } from './legacy'
import RequireAuth from './requireAuth'
import RequireOrganizationalAccount from './RequireOrganizationalAccount'
import { PROJECTS_ROUTES, ROUTES } from './routerConstants'

const Reports = React.lazy(() => import(/* webpackPrefetch: true */ '#/components/reports/reports'))
const FormLanding = React.lazy(() => import(/* webpackPrefetch: true */ '#/components/formLanding/formLanding'))
const FormSummary = React.lazy(() => import(/* webpackPrefetch: true */ '#/components/formSummary/formSummary'))
const FormSubScreens = React.lazy(() => import(/* webpackPrefetch: true */ '#/components/formSubScreens'))
const FormXform = React.lazy(() => import(/* webpackPrefetch: true */ '#/components/formXform'))
const FormJson = React.lazy(() => import(/* webpackPrefetch: true */ '#/components/formJson'))
const SectionNotFound = React.lazy(() => import(/* webpackPrefetch: true */ '#/components/sectionNotFound'))
const FormNotFound = React.lazy(() => import(/* webpackPrefetch: true */ '#/components/formNotFound'))
const PANEL_COMPONENTS = new Map(
  NAVIGATION_MODULES.flatMap((module) =>
    module.panels
      ?.filter((panel) => typeof panel.component === 'function')
      .map((panel) => [panel.id, React.lazy(panel.component!)] as const) ?? [],
  ),
)

const ORGANIZATIONAL_MODULES = NAVIGATION_MODULES.filter(
  (module) => module.requiresOrganizational && module.panels?.some((panel) => panel.component),
)

const getPanelPathSegment = (moduleRoute: string, panelRoute: string) => {
  if (!panelRoute.startsWith(moduleRoute)) {
    return panelRoute
  }

  const trimmed = panelRoute.slice(moduleRoute.length)

  return trimmed.startsWith('/') ? trimmed.slice(1) : trimmed
}

export const router = createHashRouter(
  createRoutesFromElements(
    <Route path={ROUTES.ROOT} element={<App />}>
      <Route path={ROUTES.ROOT} element={<Navigate to={ROUTES.FORMS} replace />} />
      <Route path={ROUTES.ACCOUNT_ROOT}>{accountRoutes()}</Route>
      {projectsRoutes()}
      <Route path={ROUTES.LIBRARY}>
        <Route path='' element={<Navigate to={ROUTES.MY_LIBRARY} replace />} />
        <Route
          path={ROUTES.MY_LIBRARY}
          element={
            <RequireAuth>
              <MyLibraryRoute />
            </RequireAuth>
          }
        />
        <Route
          path={ROUTES.PUBLIC_COLLECTIONS}
          element={
            <RequireAuth>
              <PublicCollectionsRoute />
            </RequireAuth>
          }
        />
        <Route
          path={ROUTES.NEW_LIBRARY_ITEM}
          element={
            <RequireAuth>
              <LibraryAssetEditor />
            </RequireAuth>
          }
        />
        <Route
          path={ROUTES.LIBRARY_ITEM}
          element={
            <PermProtectedRoute
              requiredPermissions={[PERMISSIONS_CODENAMES.view_asset]}
              protectedComponent={AssetRoute}
            />
          }
        />
        <Route
          path={ROUTES.EDIT_LIBRARY_ITEM}
          element={
            <PermProtectedRoute
              requiredPermissions={[PERMISSIONS_CODENAMES.change_asset]}
              protectedComponent={LibraryAssetEditor}
            />
          }
        />
        <Route
          path={ROUTES.NEW_LIBRARY_CHILD}
          element={
            <PermProtectedRoute
              requiredPermissions={[PERMISSIONS_CODENAMES.change_asset]}
              protectedComponent={LibraryAssetEditor}
            />
          }
        />
        <Route
          path={ROUTES.LIBRARY_ITEM_JSON}
          element={
            <PermProtectedRoute
              requiredPermissions={[PERMISSIONS_CODENAMES.view_asset]}
              protectedComponent={FormJson}
            />
          }
        />
        <Route
          path={ROUTES.LIBRARY_ITEM_XFORM}
          element={
            <PermProtectedRoute
              requiredPermissions={[PERMISSIONS_CODENAMES.view_asset]}
              protectedComponent={FormXform}
            />
          }
        />
      </Route>
      {ORGANIZATIONAL_MODULES.map((module) => {
        const panels = module.panels?.filter((panel) => panel.component) ?? []

        if (!panels.length) {
          return null
        }

        const defaultPanel = panels[0]

        return (
          <Route
            key={module.id}
            path={module.route}
            element={
              <RequireAuth>
                <RequireOrganizationalAccount moduleLabel={module.label}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Outlet />
                  </Suspense>
                </RequireOrganizationalAccount>
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to={defaultPanel.route} replace />} />
            {panels.map((panel) => {
              const PanelComponent = PANEL_COMPONENTS.get(panel.id)

              if (!PanelComponent) {
                return null
              }

              return (
                <Route
                  key={panel.id}
                  path={getPanelPathSegment(module.route, panel.route)}
                  element={<PanelComponent />}
                />
              )
            })}
          </Route>
        )
      })}
      <Route path={ROUTES.FORMS}>
        <Route
          index
          // A redirect to `/projects/home` if someone arrives at the old `/forms` route.
          element={<Navigate to={PROJECTS_ROUTES.MY_PROJECTS} replace />}
        />
        <Route path={ROUTES.FORM}>
          <Route path='' element={<Navigate to={'./landing'} replace />} />

          <Route
            path={ROUTES.FORM_SUMMARY}
            element={
              <PermProtectedRoute
                requiredPermissions={[PERMISSIONS_CODENAMES.view_asset]}
                protectedComponent={FormSummary}
              />
            }
          />

          <Route
            path={ROUTES.FORM_LANDING}
            element={
              <PermProtectedRoute
                requiredPermissions={[PERMISSIONS_CODENAMES.view_asset]}
                protectedComponent={FormLanding}
              />
            }
          />

          <Route path={ROUTES.FORM_DATA}>
            <Route path='' element={<Navigate to={'./table'} replace />} />
            <Route
              path={ROUTES.FORM_REPORT}
              element={
                <PermProtectedRoute
                  requiredPermissions={[PERMISSIONS_CODENAMES.view_submissions]}
                  protectedComponent={Reports}
                />
              }
            />
            <Route
              path={ROUTES.FORM_TABLE}
              element={
                <PermProtectedRoute
                  protectedComponent={FormSubScreens}
                  requiredPermissions={[PERMISSIONS_CODENAMES.view_submissions]}
                />
              }
            />
            <Route
              path={ROUTES.FORM_DOWNLOADS}
              element={
                <PermProtectedRoute
                  protectedComponent={FormSubScreens}
                  requiredPermissions={[PERMISSIONS_CODENAMES.view_submissions]}
                />
              }
            />
            <Route
              path={ROUTES.FORM_GALLERY}
              element={
                <PermProtectedRoute
                  protectedComponent={FormSubScreens}
                  requiredPermissions={[PERMISSIONS_CODENAMES.view_submissions]}
                />
              }
            />
            <Route
              path={ROUTES.FORM_MAP}
              element={
                <PermProtectedRoute
                  protectedComponent={FormSubScreens}
                  requiredPermissions={[PERMISSIONS_CODENAMES.view_submissions]}
                />
              }
            />
            <Route
              path={ROUTES.FORM_MAP_BY}
              element={
                <PermProtectedRoute
                  protectedComponent={FormSubScreens}
                  requiredPermissions={[PERMISSIONS_CODENAMES.view_submissions]}
                />
              }
            />
            <Route path={ROUTES.FORM_PROCESSING_ROOT}>{processingRoutes()}</Route>
          </Route>

          <Route path={ROUTES.FORM_SETTINGS}>
            <Route
              index
              element={
                <PermProtectedRoute
                  protectedComponent={FormSubScreens}
                  requiredPermissions={[
                    PERMISSIONS_CODENAMES.change_metadata_asset,
                    PERMISSIONS_CODENAMES.change_asset,
                  ]}
                />
              }
            />
            <Route
              path={ROUTES.FORM_MEDIA}
              element={
                <PermProtectedRoute
                  protectedComponent={FormSubScreens}
                  requiredPermissions={[PERMISSIONS_CODENAMES.change_asset]}
                />
              }
            />
            <Route
              path={ROUTES.FORM_SHARING}
              element={
                <PermProtectedRoute
                  protectedComponent={FormSubScreens}
                  requiredPermissions={[PERMISSIONS_CODENAMES.manage_asset]}
                />
              }
            />
            <Route
              path={ROUTES.FORM_RECORDS}
              element={
                <PermProtectedRoute
                  protectedComponent={FormSubScreens}
                  requiredPermissions={[PERMISSIONS_CODENAMES.manage_asset]}
                />
              }
            />
            <Route
              path={ROUTES.FORM_REST}
              element={
                <PermProtectedRoute
                  protectedComponent={FormSubScreens}
                  requiredPermissions={[PERMISSIONS_CODENAMES.change_asset, PERMISSIONS_CODENAMES.view_submissions]}
                  requireAll
                />
              }
            />
            <Route
              path={ROUTES.FORM_REST_HOOK}
              element={
                <PermProtectedRoute
                  protectedComponent={FormSubScreens}
                  requiredPermissions={[PERMISSIONS_CODENAMES.manage_asset]}
                />
              }
            />

            <Route
              path={ROUTES.FORM_ACTIVITY}
              element={
                <PermProtectedRoute
                  protectedComponent={FormSubScreens}
                  requiredPermissions={[PERMISSIONS_CODENAMES.manage_asset]}
                />
              }
            />
          </Route>

          <Route
            path={ROUTES.FORM_JSON}
            element={
              <PermProtectedRoute
                protectedComponent={FormJson}
                requiredPermissions={[PERMISSIONS_CODENAMES.view_asset]}
              />
            }
          />
          <Route
            path={ROUTES.FORM_XFORM}
            element={
              <PermProtectedRoute
                protectedComponent={FormXform}
                requiredPermissions={[PERMISSIONS_CODENAMES.view_asset]}
              />
            }
          />
          <Route
            path={ROUTES.FORM_EDIT}
            element={
              <PermProtectedRoute
                protectedComponent={FormPage}
                requiredPermissions={[PERMISSIONS_CODENAMES.view_asset]}
              />
            }
          />
          {/**
           * TODO change this HACKFIX to a better solution
           *
           * Used to force refresh form sub routes. It's some kind of a weird
           * way of introducing a loading screen during sub route refresh.
           * See: https://github.com/kobotoolbox/kpi/issues/3925
           *
           * NOTE: To make this more noticeable, you can increase the
           * timeout in FormViewTabs' triggerRefresh().
           **/}
          <Route
            path={ROUTES.FORM_RESET}
            element={
              <PermProtectedRoute
                protectedComponent={FormSubScreens}
                requiredPermissions={[PERMISSIONS_CODENAMES.view_submissions]}
              />
            }
          />
        </Route>
        <Route
          path='*'
          element={
            <Suspense fallback={null}>
              <FormNotFound />
            </Suspense>
          }
        />
      </Route>
      <Route
        path='*'
        element={
          <Suspense fallback={null}>
            <SectionNotFound />
          </Suspense>
        }
      />
    </Route>,
  ),
)

injectRouter(router)

export default router
