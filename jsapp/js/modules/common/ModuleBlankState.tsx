import React from 'react'

import styles from './moduleBlankState.module.scss'

interface ModuleBlankStateProps {
  heading: string
  description: string
  supportText?: string
}

const ModuleBlankState: React.FC<ModuleBlankStateProps> = ({ heading, description, supportText }) => (
  <div className={styles.blankState}>
    <h2 className={styles.heading}>{heading}</h2>
    <p className={styles.description}>{description}</p>
    {supportText && <p className={styles.support}>{supportText}</p>}
  </div>
)

export default ModuleBlankState
