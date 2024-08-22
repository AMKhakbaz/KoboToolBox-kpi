// Libraries
import React from 'react';
import clonedeep from 'lodash.clonedeep';

// Partial components
import InlineMessage from 'js/components/common/inlineMessage';
import LoadingSpinner from 'js/components/common/loadingSpinner';
import Modal from 'js/components/common/modal';
import DocumentTitle from 'react-document-title';
import CustomReportForm from './customReportForm.component';
import QuestionGraphSettings from './questionGraphSettings.component';
import ReportContents from './reportContents.component';
import ReportStyleSettings from './reportStyleSettings.component';
import CenteredMessage from 'js/components/common/centeredMessage.component';
import Button from 'js/components/common/button';
import KoboSelect from 'js/components/common/koboSelect';

// Utilities
import {dataInterface} from 'js/dataInterface';
import {actions} from 'js/actions';
import bem from 'js/bem';
import {stores} from 'js/stores';
import {txtid, notify, launchPrinting} from 'js/utils';
import {userCan} from 'js/components/permissions/utils';
import {getDataWithResponses} from './reports.utils';

// Types & constants
import {REPORT_STYLES} from './reportsConstants';
import type {
  AssetResponseReportStyles,
  CustomReport,
  ReportsPaginatedResponse,
  ReportsResponse,
} from './reportsConstants';
import type {WithRouterProps} from 'jsapp/js/router/legacy';
import type {
  AssetResponse,
  SurveyRow,
  FailResponse,
} from 'js/dataInterface';

// Styles
import './reports.scss';

interface ReportsProps extends WithRouterProps {
  uid?: string;
  assetid?: string;
}

export interface ReportsState {
  asset?: AssetResponse;
  currentCustomReport?: CustomReport;
  /** This is question name. */
  currentQuestionGraph?: string;
  error?: FailResponse;
  groupBy?: string;
  isFullscreen: boolean;
  reportCustom?: {
    [crid: string]: CustomReport;
  };
  reportData?: ReportsResponse[];
  reportLimit?: number;
  reportStyles?: AssetResponseReportStyles;
  rowsByKuid?: {[kuid: string]: SurveyRow};
  rowsByIdentifier?: {[identifier: string]: SurveyRow};
  showCustomReportModal: boolean;
  showReportGraphSettings: boolean;
  graphWidth: string;
  graphHeight: string;
  activeModalTab: number;
}

export default class Reports extends React.Component<ReportsProps, ReportsState> {
  constructor(props: ReportsProps) {
    super(props);

    this.state = {
      graphWidth: '700',
      graphHeight: '250',
      activeModalTab: 0,
      isFullscreen: false,
      reportLimit: 200,
      showReportGraphSettings: false,
      showCustomReportModal: false,
      currentCustomReport: undefined,
      currentQuestionGraph: undefined,
      groupBy: '',
    };
  }

  componentDidMount() {
    this.loadReportData();
    // NOTE: here we listen to `setStyle` and `setCustom` being triggered, not
    // to the API call responses. Why?
    actions.reports.setStyle.listen(this.reportStyleListener.bind(this));
    actions.reports.setCustom.listen(this.reportCustomListener.bind(this));
  }

  componentDidUpdate(_prevProps: ReportsProps, prevState: ReportsState) {
    if (this.state.currentCustomReport !== prevState.currentCustomReport) {
      this.refreshReportData();
    }
    if (this.state.groupBy !== prevState.groupBy) {
      this.refreshReportData();
    }
  }

  loadReportData() {
    const uid = this.props.params.assetid || this.props.params.uid;

    stores.allAssets.whenLoaded(uid, (asset: AssetResponse) => {
      const rowsByKuid: {[kuid: string]: SurveyRow} = {};
      const rowsByIdentifier: {[identifier: string]: SurveyRow} = {};
      let groupBy = '';
      // TODO: the code below is overriding the `ReportStyles` coming from
      // `AssetResponse` for some reason (to be researched…), we clone it to
      // avoid mutation.
      const reportStyles: AssetResponseReportStyles = clonedeep(asset.report_styles);
      const reportCustom = asset.report_custom;

      if (this.state.currentCustomReport?.reportStyle?.groupDataBy) {
        groupBy = this.state.currentCustomReport.reportStyle.groupDataBy;
      } else if (reportStyles.default?.groupDataBy !== undefined) {
        groupBy = reportStyles.default.groupDataBy;
      }

      // Here we override the `ReportStyles` in case the default values are
      // not present.
      if (reportStyles.default === undefined) {
        reportStyles.default = {};
      }
      if (reportStyles.default?.report_type === undefined) {
        reportStyles.default.report_type = REPORT_STYLES.vertical.value;
      }
      if (reportStyles.default?.translationIndex === undefined) {
        reportStyles.default.translationIndex = 0;
      }
      if (reportStyles.default?.groupDataBy === undefined) {
        reportStyles.default.groupDataBy = '';
      }

      if (asset.content?.survey) {
        asset.content.survey.forEach((r) => {
          if (r.$kuid) {
            rowsByKuid[r.$kuid] = r;
          }

          const $identifier: string | undefined = r.$autoname || r.name;
          if ($identifier) {
            rowsByIdentifier[$identifier] = r;
          }
        });

        dataInterface
          .getReportData({uid: uid, identifiers: [], group_by: groupBy})
          .done((data: ReportsPaginatedResponse) => {
            const dataWithResponses = getDataWithResponses(rowsByIdentifier, data);

            console.log('xxx data with responses', data, dataWithResponses);

            this.setState({
              asset: asset,
              rowsByKuid: rowsByKuid,
              rowsByIdentifier: rowsByIdentifier,
              reportStyles: reportStyles,
              reportData: dataWithResponses,
              reportCustom: reportCustom,
              groupBy: groupBy,
              error: undefined,
            });
          })
          .fail((err: FailResponse) => {
            if (
              groupBy &&
              groupBy.length > 0 &&
              !this.state.currentCustomReport &&
              reportStyles.default?.groupDataBy !== undefined
            ) {
              // reset default report groupBy if it fails and notify user
              reportStyles.default.groupDataBy = '';
              this.setState({reportStyles: reportStyles});
              notify.error(
                t(
                  'Could not load grouped results via "##". Will attempt to load the ungrouped report.'
                ).replace('##', groupBy)
              );
              this.loadReportData();
            } else {
              this.setState({
                error: err,
                asset: asset,
              });
            }
          });
      } else {
        // Redundant?
        console.error('Survey not defined.');
      }
    });
  }

  refreshReportData() {
    const uid = this.props.params.assetid || this.props.params.uid;
    const rowsByIdentifier = this.state.rowsByIdentifier;
    const customReport = this.state.currentCustomReport;

    let groupBy: string | undefined = '';

    if (
      !customReport &&
      this.state.reportStyles?.default?.groupDataBy !== undefined
    ) {
      groupBy = this.state.reportStyles.default.groupDataBy;
    }

    if (customReport?.reportStyle?.groupDataBy) {
      groupBy = this.state.currentCustomReport?.reportStyle.groupDataBy;
    }

    dataInterface
      .getReportData({uid: uid, identifiers: [], group_by: groupBy})
      .done((data: ReportsPaginatedResponse) => {
        const dataWithResponses = getDataWithResponses(rowsByIdentifier || {}, data);
        this.setState({
          reportData: dataWithResponses,
          error: undefined,
        });
      })
      .fail((err: FailResponse) => {
        notify.error(t('Could not refresh report.'));
        this.setState({error: err});
      });
  }

  reportStyleListener(
    _assetUid: string,
    reportStyles: AssetResponseReportStyles
  ) {
    this.setState({
      reportStyles: reportStyles,
      showReportGraphSettings: false,
      currentQuestionGraph: undefined,
      groupBy: reportStyles.default?.groupDataBy || '',
    });
  }

  reportCustomListener(
    _assetUid: string,
    reportCustom: {[crid: string]: CustomReport}
  ) {
    const crid = this.state.currentCustomReport?.crid;
    let newGroupBy;

    if (crid && reportCustom[crid]) {
      if (reportCustom[crid].reportStyle?.groupDataBy) {
        newGroupBy = reportCustom[crid].reportStyle.groupDataBy;
      }

      this.setState({
        reportCustom: reportCustom,
        showCustomReportModal: false,
        showReportGraphSettings: false,
        currentQuestionGraph: undefined,
        groupBy: newGroupBy,
      });
    } else {
      this.setState({
        reportCustom: reportCustom,
        showCustomReportModal: false,
        showReportGraphSettings: false,
        currentQuestionGraph: undefined,
        currentCustomReport: undefined,
        groupBy: newGroupBy,
      });
    }
  }

  onSelectedReportChange(crid: string) {
    console.log('onSelectedReportChange', crid);
    if (crid === '') {
      this.triggerDefaultReport();
    } else {
      this.setCustomReport(crid);
    }
  }

  toggleReportGraphSettings() {
    this.setState({
      showReportGraphSettings: !this.state.showReportGraphSettings,
    });
  }

  hasAnyProvidedData(reportData: ReportsResponse[]) {
    let hasAny = false;
    reportData.map((rowContent) => {
      if (rowContent.data.provided) {
        hasAny = true;
      }
    });
    return hasAny;
  }

  /**
   * If you don't pass `crid`, new report would be created.
   */
  setCustomReport(crid?: string) {
    if (!this.state.showCustomReportModal) {
      let currentCustomReport: CustomReport | undefined;
      if (crid) {
        // existing report
        currentCustomReport = this.state.reportCustom?.[crid];
      } else {
        // new custom report
        currentCustomReport = {
          crid: txtid(),
          name: '',
          questions: [],
          reportStyle: {},
        };
      }
      this.setState({currentCustomReport: currentCustomReport});
    }
  }

  editCustomReport() {
    if (this.state.currentCustomReport) {
      this.setState({showCustomReportModal: true});
    }
  }

  toggleCustomReportModal() {
    if (!this.state.showCustomReportModal) {
      this.setCustomReport();
    } else if (this.state.currentCustomReport) {
      var crid = this.state.currentCustomReport.crid;
      if (this.state.reportCustom?.[crid] == undefined) {
        this.triggerDefaultReport();
      }
    }

    this.setState({showCustomReportModal: !this.state.showCustomReportModal});
  }

  triggerDefaultReport() {
    this.setState({currentCustomReport: undefined});
  }

  toggleFullscreen() {
    this.setState({isFullscreen: !this.state.isFullscreen});
  }

  renderReportButtons() {
    var customReports = this.state.reportCustom || {};
    var customReportsList = [];
    for (var key in customReports) {
      if (customReports[key] && customReports[key].crid) {
        customReportsList.push(customReports[key]);
      }
    }

    customReportsList.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });

    let menuLabel = t('Custom Reports');
    if (this.state.currentCustomReport) {
      menuLabel = this.state.currentCustomReport.name || t('Untitled Report');
    }

    const reportsSelectorOptions = customReportsList.map((item) => {
      return {
        value: item.crid,
        label: item.name || t('Untitled report'),
      }
    });
    reportsSelectorOptions.unshift({
      value: '',
      label: t('Default Report'),
    })

    return (
      <bem.FormView__reportButtons>
        <div className='form-view__report-buttons-left'>
          <KoboSelect
            className='custom-reports-selector'
            name='custom-reports'
            type='outline'
            size='m'
            isClearable={false}
            options={reportsSelectorOptions}
            selectedOption={this.state.currentCustomReport?.crid || ''}
            onChange={(newVal) => {
              if (newVal !== null) {
                this.onSelectedReportChange(newVal);
              }
            }}
          />

          <Button
            type='primary'
            size='m'
            startIcon='plus'
            onClick={this.toggleCustomReportModal.bind(this)}
            tooltip={t('Create New Report')}
          />

          <Button
            type='text'
            size='m'
            startIcon='edit'
            onClick={this.editCustomReport.bind(this)}
            tooltip={t('Edit Report Questions')}
            isDisabled={!this.state.currentCustomReport}
          />

          <Button
            type='text'
            size='m'
            startIcon='settings'
            onClick={this.toggleReportGraphSettings.bind(this)}
            tooltip={t('Configure Report Style')}
            isDisabled={!userCan('change_asset', this.state.asset)}
          />
        </div>

        <div className='form-view__report-buttons-right'>
          <Button
            type='text'
            size='m'
            startIcon='print'
            onClick={launchPrinting}
            tooltip={t('Print')}
            tooltipPosition='right'
          />

          <Button
            type='text'
            size='m'
            startIcon='expand'
            onClick={this.toggleFullscreen.bind(this)}
            tooltip={t('Toggle fullscreen')}
            tooltipPosition='right'
          />
        </div>
      </bem.FormView__reportButtons>
    );
  }

  renderCustomReportModal() {
    if (
      !this.state.reportData ||
      !this.state.currentCustomReport ||
      !this.state.asset
    ) {
      return null;
    }

    return (
      <bem.GraphSettings>
        <Modal.Body>
          <CustomReportForm
            reportData={this.state.reportData}
            customReport={this.state.currentCustomReport}
            asset={this.state.asset}
          />
        </Modal.Body>
      </bem.GraphSettings>
    );
  }

  resetReportLimit() {
    this.setState({
      reportLimit: undefined,
    });
  }

  triggerQuestionSettings(questionName: string) {
    if (questionName) {
      this.setState({currentQuestionGraph: questionName});
    }
  }

  renderQuestionSettings() {
    return (
      <bem.GraphSettings>
        <Modal.Body />
      </bem.GraphSettings>
    );
  }

  closeQuestionSettings() {
    this.setState({currentQuestionGraph: undefined});
  }

  renderLoadingOrError() {
    if (this.state.error) {
      return (
        <CenteredMessage
          message={(
            <>
            {t('This report cannot be loaded.')}
            <br />
            <code>
              {this.state.error.statusText}
              {': ' + this.state.error.responseText || t('An error occurred')}
            </code>
            </>
          )}
        />
      );
    } else {
      return (
        <LoadingSpinner />
      );
    }
  }

  render() {
    if (!this.state.asset) {
      return this.renderLoadingOrError();
    }

    if (this.state.reportData === undefined) {
      return this.renderLoadingOrError();
    }

    const asset = this.state.asset;
    const currentCustomReport = this.state.currentCustomReport;
    let docTitle;

    if (asset?.content) {
      docTitle = asset.name || t('Untitled');
    }

    const fullReportData = this.state.reportData || [];
    /**
     * Report data that will be displayed (after filtering out questions, etc.)
     * to the user.
     */
    let reportData = this.state.reportData || [];

    if (reportData.length) {
      if (currentCustomReport?.questions.length) {
        const currentQuestions = currentCustomReport.questions;
        reportData = fullReportData?.filter((q) => (
          currentQuestions.includes(q.name)
        ));
      }

      if (
        this.state.reportLimit &&
        reportData.length > this.state.reportLimit
      ) {
        reportData = reportData.slice(0, this.state.reportLimit);
      }
    }

    const formViewModifiers = [];
    if (this.state.isFullscreen) {
      formViewModifiers.push('fullscreen');
    }

    const hasAnyProvidedData = this.hasAnyProvidedData(reportData);
    const hasGroupBy = Boolean(this.state.groupBy);

    let noDataMessage = t('This report has no data.');
    if (hasGroupBy) {
      noDataMessage += ' ';
      noDataMessage += t('Try changing Report Style to "No grouping".');
    }

    return (
      <DocumentTitle title={`${docTitle} | KoboToolbox`}>
        <bem.FormView m={formViewModifiers}>
          <bem.ReportView>
            <h1>{t('Custom reports')}</h1>

            {this.renderReportButtons()}

            {!hasAnyProvidedData && (
              <bem.ReportView__wrap>
                <InlineMessage type='warning' message={noDataMessage}/>
              </bem.ReportView__wrap>
            )}

            {hasAnyProvidedData && (
              <bem.ReportView__wrap>
                <bem.PrintOnly>
                  <h3>{asset.name}</h3>
                </bem.PrintOnly>

                {!this.state.currentCustomReport &&
                  this.state.reportLimit &&
                  reportData.length &&
                  this.state.reportData.length > this.state.reportLimit && (
                    <InlineMessage
                      type='warning'
                      message={
                        <div className='report-view__limit-message'>
                          <p>
                            {t(
                              'For performance reasons, this report only includes the first ## questions.'
                            ).replace('##', String(this.state.reportLimit || '-'))}
                          </p>

                          <Button
                            type='secondary'
                            size='s'
                            onClick={this.resetReportLimit.bind(this)}
                            label={t('Show all (##)').replace('##', String(this.state.reportData.length))}
                          />
                        </div>
                      }
                    />
                  )
                }

                <InlineMessage
                  type='warning'
                  icon='alert'
                  message={t('This is an automated report based on raw data submitted to this project. Please conduct proper data cleaning prior to using the graphs and figures used on this page.')}
                />

                <ReportContents
                  parentState={this.state}
                  reportData={reportData}
                  triggerQuestionSettings={this.triggerQuestionSettings.bind(this)}
                />
              </bem.ReportView__wrap>
            )}

            {this.state.showReportGraphSettings && (
              <Modal
                open
                onClose={this.toggleReportGraphSettings.bind(this)}
                title={t('Edit Report Style')}
              >
                <ReportStyleSettings parentState={this.state} />
              </Modal>
            )}

            {this.state.showCustomReportModal && (
              <Modal
                open
                onClose={this.toggleCustomReportModal.bind(this)}
                title={t('Custom Report')}
              >
                {this.renderCustomReportModal()}
              </Modal>
            )}

            {this.state.currentQuestionGraph && (
              <Modal
                open
                onClose={this.closeQuestionSettings.bind(this)}
                title={t('Question Style')}
              >
                <QuestionGraphSettings
                  question={this.state.currentQuestionGraph}
                  parentState={this.state}
                />
              </Modal>
            )}
          </bem.ReportView>
        </bem.FormView>
      </DocumentTitle>
    );
  }
}
