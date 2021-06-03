import _ from 'underscore';
import {actions} from '../actions';
import {
  notify,
  unnullifyTranslations
} from 'utils';

class SurveyScope {
  constructor ({survey}) {
    this.survey = survey;
  }
  add_row_to_question_library (row, assetContent) {
    var surv = this.survey.toFlatJSON();
    let content;
    /*
     * Apply translations "hack" again for saving single questions to library
     * Since `unnullifyTranslations` requires the whole survey, we need to
     * fish out the saved row and its translation settings out of the unnullified return
     */
    var unnullifiedContent = JSON.parse(unnullifyTranslations(JSON.stringify(surv), assetContent));
    var settingsObj = unnullifiedContent.settings;
    var surveyObj = unnullifiedContent.survey;
    
    if (row.constructor.kls === 'Row') {
      var rowJSON = row.toJSON2();
      if (rowJSON.type === 'select_one' || rowJSON.type === 'select_multiple') {
        var choices = unnullifiedContent.choices.filter(s => s.list_name === rowJSON.select_from_list_name);
        for (var i in surveyObj) {
          if (surveyObj[i].$kuid == row.toJSON2().$kuid) {
            content = JSON.stringify({
              survey: [
                surveyObj[i]
              ],
              choices: choices,
              settings: settingsObj
            });
          }
        }
      } else {
        for (var j in surveyObj) {
          if (surveyObj[j].$kuid == row.toJSON2().$kuid) {
            content = JSON.stringify({
              survey: [
                surveyObj[j]
              ],
              choices: choices,
              settings: settingsObj
            });
          }
        }
      }
      actions.resources.createResource.triggerAsync({
        asset_type: 'question',
        content: content
      }).then(function(){
        notify(t('question has been added to the library'));
      });
    } else { // add group as block to library
      var groupSurveyObj = [];
      var groupChoices = [];
      var groupSettings = [{}];
      
      var groupKuid = row.toJSON2().$kuid;
      if (!_.isEmpty(surveyObj)) {
        var startGroupIndexFound = _.findIndex(surveyObj, function(content) {
          return content["$kuid"] == groupKuid;
        })
        if (startGroupIndexFound > -1) {
          var endGroupIndexFound = _.findIndex(surveyObj, function(content) {
            return content["$kuid"] == "/" + groupKuid;
          })
          groupSurveyObj = surveyObj.slice(startGroupIndexFound, endGroupIndexFound + 1);
        }
      }

      if (groupSurveyObj.length > 0) {
        var selectSurveyContents = surveyObj.filter(content => ['select_one', 'select_multiple'].indexOf(content.type) > -1);
        if (selectSurveyContents.length > 0) {
          var selectListNames = _.pluck(selectSurveyContents, 'select_from_list_name');
          groupChoices = unnullifiedContent.choices.filter(choice => selectListNames.indexOf(choice.list_name) > -1);;
        }
        
      }

      if (!_.isEmpty(settingsObj[0])) {
        var settings = settingsObj[0];
        for (var setting in ['style', 'version', 'form_id']) {
          if (_.has(settings, setting)) {
            groupSettings[0][setting] = settings[setting];
          }
        }
      }

      content = JSON.stringify({
        survey: groupSurveyObj,
        choices: groupChoices,
        settings: settingsObj
      });

      actions.resources.createResource.triggerAsync({
        asset_type: 'block',
        content: content,
        name: row.get("name").get("value")
      }).then(function(){
        notify(t('group has been added to the library as a block'));
      });
    }
  }
  handleItem({position, itemUid, groupId}) {
    if (!itemUid) {
      throw new Error('itemUid not provided!');
    }

    actions.survey.addExternalItemAtPosition({
      position: position,
      uid: itemUid,
      survey: this.survey,
      groupId: groupId
    });
  }
}

export default SurveyScope;
