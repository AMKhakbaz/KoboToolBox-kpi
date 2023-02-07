import React from 'react';
import Button from 'js/components/common/button';
import TextBox from 'js/components/common/textBox';
import KoboSelect from 'js/components/common/koboSelect';
import {generateUid} from 'js/utils';
import type {
  FilterConditionName,
  ProjectFieldName,
  ProjectsFilterDefinition,
} from './constants';
import {FILTER_CONDITIONS, PROJECT_FIELDS} from './constants';
import {isFilterConditionValueRequired} from './utils';
import envStore from 'js/envStore';
import WrappedSelect from 'js/components/common/wrappedSelect';
import styles from './projectsFilterEditor.module.scss';

interface ProjectsFilterEditorProps {
  filter: ProjectsFilterDefinition;
  hideLabels?: boolean;
  /** Called on every change. */
  onFilterChange: (filter: ProjectsFilterDefinition) => void;
  onDelete: () => void;
}

const COUNTRIES = envStore.data.country_choices;

export default function ProjectsFilterEditor(props: ProjectsFilterEditorProps) {
  const onFilterValueChange = (newValue: string) => {
    props.onFilterChange({
      fieldName: props.filter.fieldName,
      condition: props.filter.condition,
      value: newValue,
    });
  };

  const onFieldSelectorChange = (newValue: string | null) => {
    let fieldValue;
    if (newValue) {
      fieldValue = newValue as ProjectFieldName;
    }
    props.onFilterChange({
      fieldName: fieldValue,
      // Switching field causes the condition to be dropped - this ensures
      // we don't end up with unsupported field x condition pair :heart:.
      condition: undefined,
      // We also drop the value (if any) as it doesn't make sense to keep it
      // without condition :shrug:.
      value: undefined,
    });
  };

  const onConditionSelectorChange = (newValue: string | null) => {
    let conditionValue;
    if (newValue) {
      conditionValue = newValue as FilterConditionName;
    }
    props.onFilterChange({
      fieldName: props.filter.fieldName,
      condition: conditionValue,
      value: props.filter.value,
    });
  };

  const getFieldSelectorOptions = () =>
    Object.values(PROJECT_FIELDS)
      // We don't want to display fields with zero filters available.
      .filter(
        (filterDefinition) => filterDefinition.availableConditions.length >= 1
      )
      .map((filterDefinition) => {
        return {label: filterDefinition.label, id: filterDefinition.name};
      });

  const getConditionSelectorOptions = () => {
    if (!props.filter.fieldName) {
      return [];
    }
    const fieldDefinition = PROJECT_FIELDS[props.filter.fieldName];
    return fieldDefinition.availableConditions.map(
      (condition: FilterConditionName) => {
        const conditionDefinition = FILTER_CONDITIONS[condition];
        return {label: conditionDefinition.label, id: conditionDefinition.name};
      }
    );
  };

  const codeToCountry = (code: string) => {
    let matchedCountry = 'Canada'; // Default to just show something

    COUNTRIES.forEach((item) => {
      if (item.value === code) {
        matchedCountry = item.label;
      }
    });

    return matchedCountry;
  };

  return (
    <div className={styles.root}>
      {/* Filter field selector */}
      <div className={styles.column}>
        {!props.hideLabels && (
          <span className={styles.label}>{t('Filter by')}</span>
        )}
        <KoboSelect
          name={generateUid()}
          type='outline'
          size='m'
          isClearable
          isSearchable
          options={getFieldSelectorOptions()}
          selectedOption={props.filter.fieldName || null}
          onChange={onFieldSelectorChange}
          placeholder={t('Select field')}
        />
      </div>

      {/* Filter condition selector */}
      <div className={styles.column}>
        {!props.hideLabels && (
          <span className={styles.label}>{t('Condition')}</span>
        )}
        <KoboSelect
          name={generateUid()}
          type='outline'
          size='m'
          isClearable
          isSearchable
          options={getConditionSelectorOptions()}
          selectedOption={props.filter.condition || null}
          onChange={onConditionSelectorChange}
          placeholder={t('Select condition')}
          // Requires field to be selected first
          isDisabled={!props.filter.fieldName}
        />
      </div>

      {/* Filter value */}
      <div className={styles.column}>
        {/*
        {!props.hideLabels && (
          <span className={styles.label}>{t('Value')}</span>
        )}
        {!isFilterConditionValueRequired(props.filter.condition) && <div />}
        {isFilterConditionValueRequired(props.filter.condition) && (
          <TextBox
            customModifiers='on-white'
            value={props.filter.value || ''}
            onChange={onFilterValueChange}
            placeholder={t('Enter value')}
            // Requires field to be selected first
            disabled={!props.filter.fieldName}
          />
        )}
          */}
        <WrappedSelect
          label={t('Country')}
          // Process the corrent string here
          value={codeToCountry(props.filter.value || '')}
          // To avoid changes to current types, I want to send the code still
          onChange={(country: any) => {onFilterValueChange(country.value)}}
          options={COUNTRIES}
          isLimitedHeight
          menuPlacement='top'
          isClearable
          data-cy='country'
        />
      </div>

      <div className={styles.column}>
        <Button
          type='bare'
          color='red'
          size='m'
          onClick={props.onDelete}
          startIcon='trash'
        />
      </div>
    </div>
  );
}
