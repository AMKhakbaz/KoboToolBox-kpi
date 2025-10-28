import React from 'react'

import { Navigate, Route } from 'react-router-dom'

import ModulePanelPage from './ModulePanelPage'
import { MODULE_DEFINITIONS } from './moduleConfig'
import RequireAuth from '#/router/requireAuth'

export default function moduleRoutes() {
  return (
    <>
      {MODULE_DEFINITIONS.map((moduleDefinition) => (
        <Route key={moduleDefinition.key} path={moduleDefinition.route}>
          <Route
            index
            element={
              moduleDefinition.panels.length > 0 ? (
                <Navigate
                  to={`${moduleDefinition.route}/${moduleDefinition.panels[0].path}`}
                  replace
                />
              ) : (
                <Navigate to='/' replace />
              )
            }
          />
          {moduleDefinition.panels.map((panel) => (
            <Route
              key={panel.key}
              path={panel.path}
              element={
                <RequireAuth>
                  <ModulePanelPage moduleKey={moduleDefinition.key} panelKey={panel.key} />
                </RequireAuth>
              }
            />
          ))}
        </Route>
      ))}
    </>
  )
}
