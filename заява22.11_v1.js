//UZKARGO-39
function onCreate() {
  if (CurrentDocument.inExtId) {
    EdocsApi.setAttributeValue({ code: "InExtId", value: CurrentDocument.inExtId });
    EdocsApi.setAttributeValue({ code: "DeliveryMethod", value: "1", text: "Кабінет контрагента" });

    setDataFromExtSys();
    setContractorHome();
    setTopicDocument();
    setRailwayConnectionTypeForMask();
  }
  setRequirementTypeForMaskText();
}

function setAmountAccordingProvideDocumentsOnCreate() {
  debugger;
  var AmountAccordingProvideDocuments = EdocsApi.getAttributeValue("AmountAccordingProvideDocuments")?.value;
  if (AmountAccordingProvideDocuments == "0") {
    EdocsApi.setAttributeValue({ code: "AmountAccordingProvideDocuments", value: EdocsApi.getAttributeValue("edocsDocSum").value });
  }
}

function onButtonPushButton() {
  setDataFromExtSys();
}
//----------------------------------------------------
//Заповнення даних з зовн.системи
//----------------------------------------------------
function setDataFromExtSys() {
  debugger;
  var extSysData = EdocsApi.getMainJsonFile(CurrentDocument.id);
  var ClaimKind = setClaimKind(extSysData.ClaimType_Title);
  EdocsApi.setAttributeValue(ClaimKind);
  if (extSysData.CargoNonPreservationType) {
    var SaveCargoFailureType = setSaveCargoFailureType(extSysData.CargoNonPreservationType);
    EdocsApi.setAttributeValue(SaveCargoFailureType);
  }
  if (extSysData.ClaimDescription) {
    EdocsApi.setAttributeValue({ code: "DocDescription", value: extSysData.ClaimDescription, text: null });
  }
  EdocsApi.setAttributeValue({ code: "ApplicantType", value: extSysData.ClaimantType_Title, text: null });

  if (extSysData.ClaimantCode) {
    try {
      const itemId = EdocsApi.getDictionaryData("Contragents", extSysData.ClaimantCode, [])[0]?.id;
      if (itemId) {
        const obj = EdocsApi.getDictionaryItemData("Contragents", itemId);
        EdocsApi.setAttributeValue({ code: "Counterparty", value: itemId, text: obj.attributes.find((x) => x.code == "name")?.value });
        EdocsApi.setAttributeValue({ code: "ContractorEDRPOU", value: obj.attributes.find((x) => x.code == "edrpou")?.value, text: null });
        EdocsApi.setAttributeValue({ code: "ContractorName", value: obj.attributes.find((x) => x.code == "short_name")?.value, text: null });
      } else {
        EdocsApi.setAttributeValue({ code: "ContractorEDRPOU", value: extSysData.ClaimantCode, text: null });
        EdocsApi.setAttributeValue({ code: "ContractorName", value: extSysData.ClaimantName, text: null });
      }
      EdocsApi.setAttributeValue({ code: "ContractorEDRPOUText", value: EdocsApi.getAttributeValue("ContractorEDRPOU").value, text: null });
      EdocsApi.setAttributeValue({ code: "CounterpartyText", value: EdocsApi.getAttributeValue("ContractorName").value, text: null });
    } catch {}
  }

  if (extSysData.AuthorizationDocNum) {
    EdocsApi.setAttributeValue({ code: "trust", value: extSysData.AuthorizationDocNum, text: null });
  }
  if (extSysData.AuthorizationDocDate) {
    EdocsApi.setAttributeValue({ code: "DataTrust", value: extSysData.AuthorizationDocDate, text: null });
  }
  if (extSysData.ThirdPartyName) {
    EdocsApi.setAttributeValue({ code: "ThirdPartyName", value: extSysData.ThirdPartyName, text: null });
  }
  if (extSysData.Iban) {
    EdocsApi.setAttributeValue({ code: "Bill", value: extSysData.Iban, text: null });
  }

  if (extSysData.ClaimDocs && extSysData.ClaimDocs.length > 0) {
    var Invoice_Claim_table = EdocsApi.getAttributeValue("Invoice_Claim_table");
    Invoice_Claim_table.value = [];

    for (var i = 0; i < extSysData.ClaimDocs.length; i++) {
      var row = extSysData.ClaimDocs[i];
      var dataRow = [];
      dataRow.push({ code: "Invoice_Claim_number", value: row.DocNum });
      dataRow.push({ code: "dataInvoice", value: row.DocDate });
      //dataRow.push({code:'typeInvoice', value:row.ClaimDocType, text: row.ClaimDocType_Title});
      dataRow.push({ code: "typeInvoice", value: row.ClaimDocType, text: row.ClaimDocType_Title, itemCode: null, itemDictionary: "ClaimDocTypes" });
      dataRow.push({ code: "Invoice_Claim_Amaunt", value: row.ClaimSum });

      Invoice_Claim_table.value.push(dataRow);
    }
    EdocsApi.setAttributeValue(Invoice_Claim_table);
  }
  setClaimResponsible(extSysData);
}

function setClaimResponsible(extSysData) {
  debugger;
  if (extSysData.ClaimType_Title == "Некоректне нарахування за перевезення вантажу та надані послуги") {
    EdocsApi.setAttributeValue({ code: "Rozriz", value: "Центр транспортної логістики", text: null });
  } else {
    var epdSearchResult;
    try {
      epdSearchResult = EdocsApi.getDictionaryData("EPD", null, [
        { attributeCode: "epdNum", value: extSysData.ClaimDocs[0].DocNum },
        { attributeCode: "epdDate", value: moment(extSysData.ClaimDocs[0].DocDate).format("YYYY-MM-DD") },
      ]);
    } catch (e) {}

    if (epdSearchResult.length > 0) {
      var epdData = EdocsApi.getDictionaryItemData("EPD", epdSearchResult[0].id);
      if (epdData.attributes && epdData.attributes.length > 0) {
        var direction = EdocsApi.findElementByProperty("code", "doc_type_code", epdData.attributes).value;
        if (direction == "2") {
          EdocsApi.setAttributeValue({ code: "Rozriz", value: "Головний офіс", text: null });
          EdocsApi.setAttributeValue({ code: "RailwayConnectionType", value: "Міжнародне", text: null });
        } else {
          var railway = getRailwayByCode(EdocsApi.findElementByProperty("code", "rw_to", epdData.attributes).value);
          EdocsApi.setAttributeValue({ code: "Rozriz", value: railway, text: null });
          EdocsApi.setAttributeValue({ code: "RailwayConnectionType", value: "Внутрішнє", text: null });
        }
      }
    } else {
      EdocsApi.setAttributeValue({ code: "Rozriz", value: "Головний офіс", text: null });
    }
  }
}

function setClaimKind(value) {
  switch (value) {
    case "Недотримання терміну доставки вантажу":
      return { code: "ClaimKind", value: "1", text: "Недотримання терміну доставки вантажу", itemCode: null, itemDictionary: "ClaimKinds" };
    case "Незбережене перевезення вантажу":
      return { code: "ClaimKind", value: "2", text: "Незбережене перевезення вантажу", itemCode: null, itemDictionary: "ClaimKinds" };
    case "Некоректне нарахування за перевезення вантажу та надані послуги":
      return { code: "ClaimKind", value: "3", text: "Некоректне нарахування за перевезення вантажу та надані послуги", itemCode: null, itemDictionary: "ClaimKinds" };
    case "Інше":
      return { code: "ClaimKind", value: "4", text: "Інше", itemCode: null, itemDictionary: "ClaimKinds" };
    default:
      return null;
  }
}

function setSaveCargoFailureType(value) {
  switch (value) {
    case "LossOfCargo":
      return { code: "SaveCargoFailureType", value: "1", text: "Втрата вантажу", itemCode: null, itemDictionary: "SaveCargoFailureTypes" };
    case "LackOfCargo":
      return { code: "SaveCargoFailureType", value: "2", text: "Недостача вантажу", itemCode: null, itemDictionary: "SaveCargoFailureTypes" };
    case "SpoilageOfCargo":
      return { code: "SaveCargoFailureType", value: "3", text: "Псування вантажу", itemCode: null, itemDictionary: "SaveCargoFailureTypes" };
    case "DamageOfCargo":
      return { code: "SaveCargoFailureType", value: "4", text: "Пошкодження вантажу", itemCode: null, itemDictionary: "SaveCargoFailureTypes" };
    case "NonArrivalOfCargo":
      return { code: "SaveCargoFailureType", value: "5", text: "Неприбуття вантажу", itemCode: null, itemDictionary: "SaveCargoFailureTypes" };
    default:
      return null;
  }
}

function getRailwayByCode(railwayCode) {
  switch (railwayCode) {
    case "32":
      return "Південно-Західна залізниця";
    case "35":
      return "Львів";
    case "40":
      return "Одеська залізниця";
    case "43":
      return "Південна залізниця";
    case "45":
      return "Придніпровська залізниця";
    case "48":
      return "Донецька залізниця";
    default:
      return "Головний офіс";
  }
}

//----------------------------------------------------
//Кінець заповення даних з зовн.системи
//----------------------------------------------------
/*
function getRozrizText(value){
    switch (value) {
        case '1':
            return 'Південно-Західна залізниця(Недотримання терміну доставки вантажу)';
        case '2':
            return 'Центр транспортної логістики(Незбережене перевезення вантажу)';
        case '3':
            return 'Львів(Недотримання терміну доставки вантажу)';  
        case '4':
            return 'Головний офіс(Недотримання терміну доставки вантажу)';  
        case '5':
            return 'Південна залізниця(Некоректне нарахування за перевезення вантажу та надані послуги)';
        case '6':
            return 'Придніпровська залізниця(Інше)';
        case '7':
            return 'Одеська залізниця(Інше)';
        case '8':
            return 'Центр транспортної логістики(Некоректне нарахування за перевезення вантажу та надані послуги)';
        case '9':
            return 'Одеська залізниця(Некоректне нарахування за перевезення вантажу та надані послуги)';
        case '10':
            return 'Придніпровська залізниця(Некоректне нарахування за перевезення вантажу та надані послуги)';
        case '11':
            return 'Донецька залізниця(Інше)';
    
        default:
            return null;
    }
}*/

function setRegProp() {
  debugger;
  var edocsIncomeDocumentNumber = EdocsApi.getAttributeValue("edocsIncomeDocumentNumber").value;
  var edocsIncomeDocumentDate = EdocsApi.getAttributeValue("edocsIncomeDocumentDate").value;
  if (edocsIncomeDocumentNumber && edocsIncomeDocumentDate) {
    if (EdocsApi.getAttributeValue("ClaimNumber").value != edocsIncomeDocumentNumber) EdocsApi.setAttributeValue({ code: "ClaimNumber", value: edocsIncomeDocumentNumber, text: null });
    if (EdocsApi.getAttributeValue("ClaimDate").value != moment(edocsIncomeDocumentDate).format("DD.MM.YYYY")) EdocsApi.setAttributeValue({ code: "ClaimDate", value: moment(edocsIncomeDocumentDate).format("DD.MM.YYYY"), text: null });
    if (EdocsApi.getAttributeValue("ClaimNumberCtrpt").value != edocsIncomeDocumentNumber) EdocsApi.setAttributeValue({ code: "ClaimNumberCtrpt", value: Number(edocsIncomeDocumentNumber), text: null });
    if (EdocsApi.getAttributeValue("ClaimDateCtrpt").value != moment(edocsIncomeDocumentDate).format("DD.MM.YYYY")) EdocsApi.setAttributeValue({ code: "ClaimDateCtrpt", value: moment(edocsIncomeDocumentDate).format("DD.MM.YYYY"), text: null });
  } else {
    EdocsApi.setAttributeValue({ code: "ClaimNumber", value: null, text: null });
    EdocsApi.setAttributeValue({ code: "ClaimDate", value: null, text: null });
    EdocsApi.setAttributeValue({ code: "ClaimNumberCtrpt", value: null, text: null });
    EdocsApi.setAttributeValue({ code: "ClaimDateCtrpt", value: null, text: null });
  }
}
/*function onTaskPickUpAccepted(routeStage){
    if(CurrentDocument.inExtId && routeStage.executionResult == 'pickUp'){
        EdocsApi.setAttributeValue({code: 'Responsible', value: CurrentUser.employeeId});
        EdocsApi.setAttributeValue({code: 'initiatorUnit', value: EdocsApi.getEmployeeDataByEmployeeID(CurrentUser.employeeId)?.unitName});
    }
}
*/
function onCardInitialize() {
  debugger;
  setAmountAccordingProvideDocumentsOnCreate();
  setContractorHome();
  onChangeApplicantType();
  setUnitForMask();
  setPropCtrptDocReg();

  onChangeClaimKind(true);
  if (!CurrentDocument.inExtId) {
    EdocsApi.setControlProperties({ code: "Bill", required: true });

    if (!EdocsApi.getAttributeValue("Responsible").value) {
      EdocsApi.setAttributeValue({ code: "Responsible", value: CurrentDocument.initiatorId, text: null });
      onChangeResponsible();
    }

    if (EdocsApi.getCaseTaskDataByCode("Сheck")?.executionState == "complete") setControlPropAccepted(true);
  } else {
    var Accepted = EdocsApi.getCaseTaskDataByCode("Accepted" + EdocsApi.getAttributeValue("Rozriz").value);
    Accepted?.executionState == "inProgress" ? setControlPropAccepted(false) : setControlPropAccepted(true);
    if (!EdocsApi.getAttributeValue("DataFinish").value) EdocsApi.setAttributeValue({ code: "DataFinish", value: EdocsApi.getAttributeValue("edocsIncomeDocumentDate").value, text: null });

    controlRequired("Responsible");
    //      if(Accepted?.state == 'inProgress' && !EdocsApi.getAttributeValue('Responsible').value){
    //         EdocsApi.setAttributeValue({code: 'Responsible', value: Accepted.executorId, text: null});
    //      }
  }
  setDocExecutionTerm();
}

function onTaskExecuteСheck1(routeStage) {
  if (routeStage.executionResult != "rejected") setControlPropSendOutDoc(true);
}

function onTaskExecute(routeStage) {
  if (EdocsApi.getCaseTaskDataByCode("Accepted" + EdocsApi.getAttributeValue("Rozriz").value)?.state == "completed") setControlPropAccepted(true);
}

function onRouteStartMainTask() {
  //СheckProcess();
}

function setControlPropAccepted(state) {
  controlDisable("Responsible", state);
}

function setControlPropSendOutDoc(state) {
  controlDisable("DataDoc", state);
  controlDisable("ClaimKind", state);
  controlDisable("SaveCargoFailureType", state);
  controlDisable("DataStart", state);
  controlDisable("DataFinish", state);
  controlDisable("DataVantazy", state);
  controlDisable("DocDescription", state);
  controlDisable("ApplicantType", state);
  controlDisable("RailwayConnectionType", state);
  controlDisable("trust", state);
  controlDisable("DataTrust", state);
  controlDisable("ThirdPartyName", state);
  controlDisable("Invoice_Claim_table", state);
  controlDisable("typeInvoice", state);
  controlDisable("dataInvoice", state);
  controlDisable("Invoice_Claim_number", state);
  controlDisable("Invoice_Claim_Amaunt", state);
  controlDisable("ReasonReturn", state);
  controlDisable("note", state);
  controlDisable("Bill", state);
}

function onCardRendered() {
  var DeliveryMethod = EdocsApi.getAttributeValue("DeliveryMethod");
  if (DeliveryMethod && !DeliveryMethod.value) EdocsApi.setAttributeValue({ code: "DeliveryMethod", value: "2", text: null });
}
function onChangeCounterparty() {
  const Counterparty = EdocsApi.getAttributeValue("Counterparty").value;
  if (Counterparty) {
    const obj = EdocsApi.getDictionaryItemData("Contragents", EdocsApi.getAttributeValue("Counterparty").value);
    if (obj && obj.attributes && obj.attributes.length > 0) {
      //try{
      EdocsApi.setAttributeValue({ code: "ContractorEDRPOU", value: obj.attributes.find((x) => x.code == "edrpou")?.value, text: null });
      EdocsApi.setAttributeValue({ code: "ContractorName", value: obj.attributes.find((x) => x.code == "short_name")?.value, text: null });
      //}catch{}
    }
  } else {
    EdocsApi.setAttributeValue({ code: "ContractorName", value: null, text: null });
    EdocsApi.setAttributeValue({ code: "ContractorEDRPOU", value: null, text: null });
  }
}
function setPropCtrptDocReg() {
  debugger;
  if (CurrentDocument.inExtId) {
    controlDisabled("edocsIncomeDocumentNumber");
    controlDisabled("edocsIncomeDocumentDate");
  }
}

function setDocExecutionTerm() {
  debugger;
  var create = new Date(CurrentDocument.created);
  var DocExecutionTerm = new Date(EdocsApi.getAttributeValue("DocExecutionTerm").value);
  if (EdocsApi.getAttributeValue("RailwayConnectionType").value == "Міжнародне") {
    var val = new Date(new Date().setDate(create.getDate() + 15));
    if (DocExecutionTerm.setHours(0, 0, 0, 0) != val.setHours(0, 0, 0, 0)) EdocsApi.setAttributeValue({ code: "DocExecutionTerm", value: val.toISOString(), text: null });
  } else {
    var val = new Date(new Date().setDate(create.getDate() + 10));
    if (DocExecutionTerm.setHours(0, 0, 0, 0) != val.setHours(0, 0, 0, 0)) EdocsApi.setAttributeValue({ code: "DocExecutionTerm", value: val.toISOString(), text: null });
  }
}

function onBeforeCardSave() {
  calculateTotalSum();
  setDocExecutionTerm();
  setUnitForMask();
  setRegProp();

  if (!EdocsApi.getAttributeValue("DocExecutionTerm")?.value) EdocsApi.setAttributeValue({ code: "DocExecutionTerm", value: EdocsApi.getVacationPeriodEnd(new Date(), 10), text: null });

  var ClaimKind = EdocsApi.getAttributeValue("ClaimKind")?.value;
  var ForMask = null;
  if (ClaimKind) {
    switch (ClaimKind) {
      case "1":
        ForMask = "П";
        break;
      case "2":
        ForMask = "Н";
        break;
      case "3":
        ForMask = "Р";
        break;
      case "4":
        ForMask = "І";
        break;
    }
  }
  if (EdocsApi.getAttributeValue("ForMask").value != ForMask) {
    EdocsApi.setAttributeValue({ code: "ForMask", value: ForMask, text: null });
  }
  if (EdocsApi.getAttributeValue("ContractorEDRPOU").value != EdocsApi.getAttributeValue("ContractorEDRPOUText").value) {
    EdocsApi.setAttributeValue({ code: "ContractorEDRPOUText", value: EdocsApi.getAttributeValue("ContractorEDRPOU").value, text: null });
    EdocsApi.setAttributeValue({ code: "CounterpartyText", value: EdocsApi.getAttributeValue("ContractorName").value, text: null });
  }

  if (!CurrentDocument.inExtId) {
    setRailwayConnectionTypeForMask();
  }
}

function onChangeDataVantazy() {
  setLastDate();
}

function setLastDate() {
  var DataVantazy = EdocsApi.getAttributeValue("DataVantazy").value;
  if (DataVantazy) {
    DataVantazy = new Date(DataVantazy);
    const RailwayConnectionType = EdocsApi.getAttributeValue("RailwayConnectionType").value;
    if (RailwayConnectionType == "Міжнародне") {
      const ClaimKind = EdocsApi.getAttributeValue("ClaimKind").text;
      if (ClaimKind == "Недотримання терміну доставки вантажу") {
        const buf = new Date(DataVantazy.setMonth(DataVantazy.getMonth() + 2));
        if (buf != new Date(EdocsApi.getAttributeValue("LastDate").value)) EdocsApi.setAttributeValue({ code: "LastDate", value: buf.toISOString(), text: null });
      } else if (ClaimKind == "Незбережене перевезення вантажу") {
        const buf = new Date(DataVantazy.setMonth(DataVantazy.getMonth() + 9));
        if (buf != new Date(EdocsApi.getAttributeValue("LastDate").value)) EdocsApi.setAttributeValue({ code: "LastDate", value: buf.toISOString(), text: null });
      }
    } else if (RailwayConnectionType == "Внутрішнє") {
      const buf = new Date(DataVantazy.setMonth(DataVantazy.getMonth() + 6));
      if (buf != new Date(EdocsApi.getAttributeValue("LastDate").value)) EdocsApi.setAttributeValue({ code: "LastDate", value: buf.toISOString(), text: null });
    }
  }
}

function onChangeClaimKind(init = false) {
  debugger;
  claimKind = EdocsApi.getAttributeValue("ClaimKind");
  if (claimKind && claimKind.value == "2") {
    EdocsApi.setControlProperties({ code: "SaveCargoFailureType", hidden: false, disabled: false, required: true });
  } else {
    EdocsApi.setControlProperties({ code: "SaveCargoFailureType", hidden: true, disabled: false, required: false });
  }

  if (init) {
    setTopicDocument(init);
  } else {
    setTopicDocument();
  }
}
function calculateTotalSum() {
  var tableAttr = EdocsApi.getAttributeValue("Invoice_Claim_table");
  var length = tableAttr.value ? tableAttr.value.length : 0;

  var contractAmountSum = 0;
  for (var i = 0; i < length; i++) {
    var row = tableAttr.value[i];
    var contactAmount = row.find((x) => x.code == "Invoice_Claim_Amaunt");
    contractAmountSum += contactAmount && contactAmount.value ? parseFloat(contactAmount.value) : 0;
  }
  if (EdocsApi.getAttributeValue("AmountAccordingProvideDocuments").value != contractAmountSum) EdocsApi.setAttributeValue({ code: "AmountAccordingProvideDocuments", value: contractAmountSum > 0 ? contractAmountSum : 0 });
}
/*
function onTaskExecuteAccepted(routeStage){
    if(routeStage.executionResult != 'rejected'){
        if(CurrentDocument.inExtId){
            setControlPropAccepted(true);
            var methodData = {
                extSysDocId: CurrentDocument.id,
                extSysDocVersion:  CurrentDocument.version,
                eventType: "CommentAdded",
                comment: 'Документ прийнято і зареєстровано №'+EdocsApi.getAttributeValue('RegNumber')?.value+' від '+moment(EdocsApi.getAttributeValue('RegDate')?.value).format('DD.MM.YYYY'),
                partyCode: EdocsApi.getAttributeValue('OrgCode').value,
                userTitle: CurrentUser.name,
                occuredAt: new Date()
            };
           routeStage.externalAPIExecutingParams = {externalSystemCode: 'ESIGN1', externalSystemMethod: 'integration/processEvent', data: methodData, executeAsync: false}
        }
    }
}
*/
function onChangeApplicantType() {
  debugger;
  var ApplicantType = EdocsApi.getAttributeValue("ApplicantType")?.value;
  if (ApplicantType == "Третя особа") {
    controlRequired("trust");
    controlRequired("DataTrust");
    controlRequired("ThirdPartyName");
    controlShow("trust");
    controlShow("DataTrust");
    controlShow("ThirdPartyName");
  } else {
    controlNotRequired("trust");
    controlNotRequired("DataTrust");
    controlNotRequired("ThirdPartyName");
    controlHide("trust");
    controlHide("DataTrust");
    controlHide("ThirdPartyName");
  }
}
function controlRequired(CODE) {
  var control = EdocsApi.getControlProperties(CODE);
  if (control) {
    control.required = true;
    EdocsApi.setControlProperties(control);
  }
}
function controlNotRequired(CODE) {
  var control = EdocsApi.getControlProperties(CODE);
  if (control) {
    control.required = false;
    EdocsApi.setControlProperties(control);
  }
}
function controlHide(CODE) {
  var control = EdocsApi.getControlProperties(CODE);
  if (control) {
    control.hidden = true;
    EdocsApi.setControlProperties(control);
  }
}
function controlShow(CODE) {
  var control = EdocsApi.getControlProperties(CODE);
  if (control) {
    control.hidden = false;
    EdocsApi.setControlProperties(control);
  }
}
function controlDisabled(CODE) {
  var control = EdocsApi.getControlProperties(CODE);
  if (control) {
    control.disabled = true;
    EdocsApi.setControlProperties(control);
  }
}
function controlDisable(CODE, state) {
  var control = EdocsApi.getControlProperties(CODE);
  if (control) {
    control.disabled = state;
    EdocsApi.setControlProperties(control);
  }
}
function onChangeInvoice_Claim_table() {
  debugger;
  var table = EdocsApi.getAttributeValue("Invoice_Claim_table")?.value;
  if (table) {
    var table2 = [],
      table3 = [],
      ClaimAmount2 = 0,
      ClaimAmount3 = 0,
      ClaimAmount4 = 0;
    table.forEach((row) => {
      var ReasonReturn = row.find((x) => x.code == "ReasonReturn")?.value;
      var contactAmount = row.find((x) => x.code == "Invoice_Claim_Amaunt")?.value;
      if (ReasonReturn == "Прийнято") {
        const typeInvoice = row.find((x) => x.code == "typeInvoice");
        table2.push([
          { code: "Invoice_Claim_number2", value: row.find((x) => x.code == "Invoice_Claim_number").value, text: null },
          { code: "Invoice_Claim_Amaunt2", value: row.find((x) => x.code == "Invoice_Claim_Amaunt").value, text: null },
          //{code: 'typeInvoice_Claim_table2', value: row.find(x => x.code == 'typeInvoice').text, text: null},
          { code: "typeInvoice_Claim_table2", value: typeInvoice.value, text: typeInvoice.text, itemCode: typeInvoice.itemCode, itemDictionary: typeInvoice.itemDictionary },
          { code: "dataInvoice_Claim_table2", value: row.find((x) => x.code == "dataInvoice").value, text: null },
        ]);

        ClaimAmount2 += contactAmount ? parseFloat(contactAmount) : 0;
      } else if (ReasonReturn == "Повернено") {
        table3.push([
          { code: "typeInvoice_Claim_table3", value: row.find((x) => x.code == "typeInvoice").text, text: null },
          { code: "Invoice_Claim_number3", value: row.find((x) => x.code == "Invoice_Claim_number").value, text: null },
          { code: "Invoice_Claim_Amaunt3", value: row.find((x) => x.code == "Invoice_Claim_Amaunt").value, text: null },
        ]);
        ClaimAmount3 += contactAmount ? parseFloat(contactAmount) : 0;
      } else {
        ClaimAmount4 += contactAmount ? parseFloat(contactAmount) : 0;
      }
    });
    EdocsApi.setAttributeValue({ code: "ТumbTerms", value: table.length });
    EdocsApi.setAttributeValue({ code: "ТumbTerms2", value: table2.length });
    EdocsApi.setAttributeValue({ code: "ТumbTerms3", value: table3.length });
    EdocsApi.setAttributeValue({ code: "Invoice_Claim_table2", value: table2.length > 0 ? table2 : null });
    EdocsApi.setAttributeValue({ code: "Invoice_Claim_table3", value: table3.length > 0 ? table3 : null });
    EdocsApi.setAttributeValue({ code: "ClaimAmount2", value: ClaimAmount2 });
    EdocsApi.setAttributeValue({ code: "ClaimAmount3", value: ClaimAmount3 });
    EdocsApi.setAttributeValue({ code: "AmountAccordingProvideDocuments", value: ClaimAmount3 + ClaimAmount2 + ClaimAmount4 });
    EdocsApi.setAttributeValue({ code: "edocsDocSum", value: ClaimAmount3 + ClaimAmount2 + ClaimAmount4 });
  } else {
    EdocsApi.setAttributeValue({ code: "Invoice_Claim_table2", value: null });
    EdocsApi.setAttributeValue({ code: "Invoice_Claim_table3", value: null });
    EdocsApi.setAttributeValue({ code: "ClaimAmount2", value: null });
    EdocsApi.setAttributeValue({ code: "ClaimAmount3", value: null });
    EdocsApi.setAttributeValue({ code: "AmountAccordingProvideDocuments", value: null });
    EdocsApi.setAttributeValue({ code: "edocsDocSum", value: null });
    EdocsApi.setAttributeValue({ code: "ТumbTerms", value: null });
    EdocsApi.setAttributeValue({ code: "ТumbTerms2", value: null });
    EdocsApi.setAttributeValue({ code: "ТumbTerms3", value: null });
  }
}

//Поле Результат перевірки доступне на  етапі Сheck в маршруті
function onTaskExecuteСheck(routeStage) {
  if (routeStage.executionResult != "rejected") {
    var buf = false;
    var str = "Заповніть поле(я) ";
    var Invoice_Claim_table = EdocsApi.getAttributeValue("Invoice_Claim_table").value;
    if (Invoice_Claim_table && Invoice_Claim_table.length > 0) {
      Invoice_Claim_table.map((x) => x.find((y) => y.code == "ReasonReturn").value).every((s) => {
        if (s == null) {
          buf = true;
          str += '"Результат перевірки" таблиці, ';
        }
      });
      Invoice_Claim_table.map((x) => x.find((y) => y.code == "Invoice_Claim_number").value).every((s) => {
        if (s == null) {
          buf = true;
          str += '"№  накладної" таблиці, ';
        }
      });
      Invoice_Claim_table.map((x) => x.find((y) => y.code == "Invoice_Claim_Amaunt").value).every((s) => {
        if (s == null) {
          buf = true;
          str += '"Сума" таблиці, ';
        }
      });
    } else {
      buf = true;
      str += 'таблиці "Документи за претензійною заявою", ';
    }
    if (!EdocsApi.getAttributeValue("ClaimKind").value) {
      buf = true;
      str += '"Вид претензії", ';
    }
    if (!EdocsApi.getAttributeValue("edocsIncomeDocumentNumber").value) {
      buf = true;
      str += '"№ док-та заявника", ';
    }
    if (!EdocsApi.getAttributeValue("edocsIncomeDocumentDate").value) {
      buf = true;
      str += '"Дата док-та заявника", ';
    }
    if (!EdocsApi.getAttributeValue("Counterparty").value) {
      buf = true;
      str += '"Заявник", ';
    }
    if (!EdocsApi.getAttributeValue("ApplicantType").value) {
      buf = true;
      str += '"Тип Заявника", ';
    }
    if (!EdocsApi.getAttributeValue("RailwayConnectionType").value) {
      buf = true;
      str += '"Тип залізничного сполучення", ';
    }

    if (buf) {
      throw str.slice(0, -2);
    }
  }
}

//заповнювати поле Підрозділ Ініціатора
function onChangeResponsible() {
  var Responsible = EdocsApi.getAttributeValue("Responsible").value;
  if (Responsible) {
    var empl = EdocsApi.getEmployeeDataByEmployeeID(parseInt(Responsible));
    if (empl) {
      if (EdocsApi.getAttributeValue("initiatorUnit").value != empl.unitName) EdocsApi.setAttributeValue({ code: "initiatorUnit", value: empl.unitName, text: null });
    }
  } else {
    if (EdocsApi.getAttributeValue("initiatorUnit").value) EdocsApi.setAttributeValue({ code: "initiatorUnit", value: null, text: null });
  }
}

//підрозділ Ініціатора  для маски
function setUnitForMask() {
  debugger;
  if (!EdocsApi.getAttributeValue("UnitForMask").value) {
    var Responsible = EdocsApi.getAttributeValue("Responsible").value;
    if (Responsible) {
      EdocsApi.setAttributeValue({ code: "UnitForMask", value: EdocsApi.getOrgUnitDataByUnitID(EdocsApi.getEmployeeDataByEmployeeID(Responsible).unitId, 1).unitCode, text: null });
    }
  }
}

//Поле Результат перевірки доступне на  етапі SendOutDoc в маршруті
function onTaskExecuteSendOutDoc(routeStage) {
  if (routeStage.executionResult != "rejected") {
    var buf = false;
    var str = "Заповніть поле(я) ";
    var Invoice_Claim_table = EdocsApi.getAttributeValue("Invoice_Claim_table").value;
    if (Invoice_Claim_table && Invoice_Claim_table.length > 0) {
      Invoice_Claim_table.map((x) => x.find((y) => y.code == "ReasonReturn").value).every((s) => {
        if (s == null) {
          buf = true;
          str += '"Результат перевірки" таблиці, ';
        }
      });
      Invoice_Claim_table.map((x) => x.find((y) => y.code == "Invoice_Claim_number").value).every((s) => {
        if (s == null) {
          buf = true;
          str += '"№  накладної" таблиці, ';
        }
      });
      Invoice_Claim_table.map((x) => x.find((y) => y.code == "Invoice_Claim_Amaunt").value).every((s) => {
        if (s == null) {
          buf = true;
          str += '"Сума" таблиці, ';
        }
      });
    } else {
      buf = true;
      str += 'таблиці "Документи за претензійною заявою", ';
    }
    if (!EdocsApi.getAttributeValue("ClaimKind").value) {
      buf = true;
      str += '"Вид претензії", ';
    }
    if (!EdocsApi.getAttributeValue("edocsIncomeDocumentNumber").value) {
      buf = true;
      str += '"№ док-та заявника", ';
    }
    if (!EdocsApi.getAttributeValue("edocsIncomeDocumentDate").value) {
      buf = true;
      str += '"Дата док-та заявника", ';
    }
    if (!EdocsApi.getAttributeValue("Counterparty").value) {
      buf = true;
      str += '"Заявник", ';
    }
    if (!EdocsApi.getAttributeValue("ApplicantType").value) {
      buf = true;
      str += '"Тип Заявника", ';
    }
    if (!EdocsApi.getAttributeValue("RailwayConnectionType").value) {
      buf = true;
      str += '"Тип залізничного сполучення", ';
    }
    if (!EdocsApi.getAttributeValue("Bill").value) {
      buf = true;
      str += '"Рахунок", ';
    }
    if (buf) {
      throw str.slice(0, -2);
    }
  }
}

function onChangeRailwayConnectionType() {
  setDocExecutionTerm();
  setTopicDocument();
}

function onTaskCommentedSendOutDoc(caseTaskComment) {
  if (CurrentDocument.inExtId) {
    var orgCode = EdocsApi.getAttributeValue("OrgCode").value;
    var orgShortName = EdocsApi.getAttributeValue("OrgShortName").value;
    if (!orgCode || !orgShortName) {
      return;
    }

    var methodData = {
      extSysDocId: CurrentDocument.id,
      extSysDocVersion: CurrentDocument.version,
      eventType: "CommentAdded",
      comment: caseTaskComment.comment,
      partyCode: orgCode,
      userTitle: CurrentUser.name,
      partyName: orgShortName,
      occuredAt: new Date(),
    };
    caseTaskComment.externalAPIExecutingParams = {
      externalSystemCode: "ESIGN1",
      externalSystemMethod: "integration/processEvent",
      data: methodData,
      executeAsync: true,
    };
  }
}

/*
function onTaskExecutedAccepted(routeStage){
    if (CurrentDocument.inExtId) {
         if (routeStage.executionResult == 'executed') {
             var DocCommandData = {};
             DocCommandData.docGlobalID = CurrentDocument.inExtId;
             DocCommandData.command = 'CompleteTask';
             DocCommandData.legalEntityCode = EdocsApi.getAttributeValue('OrgCode').value;
             DocCommandData.userEmail = EdocsApi.getEmployeeDataByEmployeeID(CurrentUser.employeeId).email;
             DocCommandData.userTitle = CurrentUser.fullName;
             DocCommandData.comment = 'Документ прийнято і зареєстровано №'+EdocsApi.getAttributeValue('RegNumber')?.value+' від '+moment(EdocsApi.getAttributeValue('RegDate')?.value).format('DD.MM.YYYY');
             DocCommandData.signatures = [];
             routeStage.externalAPIExecutingParams = {
                 externalSystemCode: 'ESIGN1',
                 externalSystemMethod: 'integration/processDocCommand',
                 data: DocCommandData,
                 executeAsync: false
             }
         }
     }
 }
*/
function sendToEsignNotRouteStage() {
  var DocCommandData = {};
  DocCommandData.docGlobalID = CurrentDocument.inExtId;
  DocCommandData.command = "CompleteTask";
  DocCommandData.legalEntityCode = EdocsApi.getAttributeValue("OrgCode").value;
  DocCommandData.userEmail = EdocsApi.getEmployeeDataByEmployeeID(CurrentUser.employeeId).email;
  DocCommandData.userTitle = CurrentUser.fullName;
  DocCommandData.comment = "";
  DocCommandData.signatures = [];
  EdocsApi.runExternalFunction("ESIGN1", "integration/processDocCommand", DocCommandData, "post");
}

function onTaskExecuteAccepted(routeStage) {
  if (routeStage.executionResult != "rejected") {
    if (CurrentDocument.inExtId) {
      sendToEsignNotRouteStage();

      var methodData = {
        extSysDocId: CurrentDocument.id,
        extSysDocVersion: CurrentDocument.version,
        eventType: "CommentAdded",
        comment: "Документ прийнято і зареєстрована №" + EdocsApi.getAttributeValue("RegNumber")?.value + " від " + moment(EdocsApi.getAttributeValue("RegDate")?.value).format("DD.MM.YYYY"),
        partyCode: EdocsApi.getAttributeValue("OrgCode").value,
        userTitle: CurrentUser.name,
        occuredAt: new Date(),
      };
      routeStage.externalAPIExecutingParams = {
        externalSystemCode: "ESIGN1",
        externalSystemMethod: "integration/processEvent",
        data: methodData,
        executeAsync: false,
      };
    }
  }
}

function onTaskExecuteMainTask(routeStage) {
  if (CurrentDocument.inExtId) {
    if (routeStage.executionResult == "rejected") {
      var DocCommandData = {};
      DocCommandData.docGlobalID = CurrentDocument.inExtId;
      DocCommandData.command = "RejectTask";
      DocCommandData.legalEntityCode = EdocsApi.getAttributeValue("OrgCode").value;
      DocCommandData.userEmail = EdocsApi.getEmployeeDataByEmployeeID(CurrentUser.employeeId).email;
      DocCommandData.userTitle = CurrentUser.fullName;
      DocCommandData.comment = routeStage.comment;
      DocCommandData.signatures = [];
      routeStage.externalAPIExecutingParams = {
        externalSystemCode: "ESIGN1",
        externalSystemMethod: "integration/processDocCommand",
        data: DocCommandData,
        executeAsync: false,
      };
    }
  }
}
function setContractorHome() {
  debugger;
  var ContractorCode = EdocsApi.getAttributeValue("OrgCode");
  if (!CurrentDocument.isDraft || ContractorCode.value || ContractorCode.value == "40075815") {
    return;
  }
  var OrganizationID = EdocsApi.getAttributeValue("OrganizationID");
  var OrgShortName = EdocsApi.getAttributeValue("OrgShortName");
  //var OrgSignerName = EdocsApi.getAttributeValue("OrgSignerName");

  OrgShortName.value = 'АТ "Укрзалізниця"';
  ContractorCode.value = "40075815";
  OrganizationID.value = "1";

  EdocsApi.setAttributeValue(OrgShortName);
  EdocsApi.setAttributeValue(ContractorCode);
  EdocsApi.setAttributeValue(OrganizationID);
}

function onTaskExecutedAccepted(routeStage) {
  if (routeStage.executionResult == "executed") {
    const answer = send("1");
    if (!answer.status) {
      throw answer.error;
    } else {
      console.log("Все добре! 1");
    }
  }
}

function onTaskExecutedСheck(routeStage) {
  if (routeStage.executionResult == "executed") {
    const answer = send("1");
    if (!answer.status) {
      throw answer.error;
    } else {
      console.log("Все добре! 1");
    }
  }
}

function onTaskExecutedCreateDoc(routeStage) {
  if (routeStage.executionResult == "executed") {
    const answer = send("2");
    if (!answer.status) {
      throw answer.error;
    } else {
      console.log("Все добре! 2");
    }
  }
}

function send(eventType) {
  var response = EdocsApi.runExternalFunction("PKTB", "ClaimWriteDocument", createmethodData(eventType, "10"));

  if (response && response.data == null) {
    return { status: true, error: "" };
  } else if (response.data.error) {
    if (response.data.error.validationErrors && response.data.error.validationErrors.length > 0) {
      var errorMessage = "";
      for (var i = 0; i < response.data.error.validationErrors.length; i++) {
        errorMessage += response.data.error.validationErrors[i].message + "; ";
      }
      return { status: true, error: response.data.error.details + "  -  " + errorMessage };
    }
  } else {
    return { status: true, error: "Не отримано відповіді від зовнішньої системи" };
  }
}

function createmethodData(eventType, typeDoc) {
  var methodData = {
    ExtSysId: "eDocs",
    ExtDocId: CurrentDocument.id,
    EventType: eventType,
    TypeDoc: typeDoc,
    Attributes: [
      { code: "NumDoc", value: EdocsApi.getAttributeValue("RegNumber").value },
      { code: "Applicant", value: EdocsApi.getAttributeValue("Counterparty").value },
      { code: "Rasch", value: EdocsApi.getAttributeValue("Bill").value },
      //{code: "TypeClaim", value: getTypeClaim(EdocsApi.getAttributeValue('ClaimKind').value)},
      { code: "TypeClaim", value: EdocsApi.getAttributeValue("ClaimKind").value },
      { code: "TypeConn", value: EdocsApi.getAttributeValue("RailwayConnectionType").value == "Внутрішнє" ? "1" : "2" },
      { code: "DatePrt", value: moment(EdocsApi.getAttributeValue("RegDate").value).format("YYYY-MM-DD") },
      //{code: "DatePost", value: moment(CurrentDocument.created).format('YYYY-MM-DD')},
      { code: "DatePost", value: EdocsApi.getAttributeValue("DataDoc").value ? moment(EdocsApi.getAttributeValue("DataDoc").value).format("YYYY-MM-DD") : null },
      //{code: "Srcway", value: EdocsApi.getAttributeValue('UnitForMask').value},
      { code: "Srcway", value: EdocsApi.findEmployeeSubdivisionByLevelAndEmployeeID(EdocsApi.getAttributeValue("Responsible").value, "1")?.unitCode },
      { code: "NomDov", value: EdocsApi.getAttributeValue("trust").value },
      { code: "DateDov", value: EdocsApi.getAttributeValue("DataTrust").value },
      { code: "Koment", value: EdocsApi.getAttributeValue("DocDescription").value },
      { code: "TypeApplicant", value: getTypeApplicant(EdocsApi.getAttributeValue("ApplicantType").value) },
      { code: "PathClaim", value: EdocsApi.getAttributeValue("DeliveryMethod").text == "Пошта" ? "2" : "1" },
      { code: "FioP", value: EdocsApi.getAttributeValue("Responsible").text },
      { code: "ClaimDocs", type: "table", value: getClaimDocs() },
    ],
  };

  return methodData;
}

function getTypeApplicant(key) {
  switch (key) {
    case "Відправник":
      return "1";
    case "Одержувач":
      return "2";
    case "Третя особа":
      return "3";

    default:
      return null;
  }
}

function getClaimDocs() {
  var table = EdocsApi.getAttributeValue("Invoice_Claim_table").value;

  if (table && table.length > 0) {
    var ClaimDocs = [];
    for (var i = 0; i < table.length; i++) {
      const el = table[i];
      var newEl = [
        { code: "TypeDoc", value: el.find((x) => x.code == "typeInvoice").value },
        { code: "NumDoc", value: el.find((x) => x.code == "Invoice_Claim_number").value },
        { code: "DateDoc", value: moment(el.find((x) => x.code == "dataInvoice").value).format("YYYY-MM-DD") },
        { code: "DeclaredSum", value: el.find((x) => x.code == "Invoice_Claim_Amaunt").value },
        { code: "PreliminaryRes", value: el.find((x) => x.code == "ReasonReturn").value == "Прийнято" ? "1" : "2" },
        { code: "Primit", value: el.find((x) => x.code == "note").value },
      ];
      ClaimDocs.push(newEl);
    }
    return ClaimDocs;
  } else {
    return null;
  }
}
// 17.11 Автоматичне заповненя поля Тема документу
function setTopicDocument(init) {
  debugger;
  var ClaimKind = EdocsApi.getAttributeValue("ClaimKind").text;
  var SaveCargoFailureType = EdocsApi.getAttributeValue("SaveCargoFailureType").text;
  var RailwayConnectionType = EdocsApi.getAttributeValue("RailwayConnectionType").value;
  var TopicDocument = EdocsApi.getAttributeValue("TopicDocument");

  switch (ClaimKind) {
    case "Недотримання терміну доставки вантажу":
      switch (RailwayConnectionType) {
        case "Внутрішнє":
          TopicDocument.value = 1;
          TopicDocument.text = "Просрочка/В";
          break;
        case "Міжнародне":
          TopicDocument.value = 2;
          TopicDocument.text = "Просрочка/М";
          break;
      }
      break;

    case "Незбережене перевезення вантажу":
      switch (SaveCargoFailureType) {
        case "Втрата вантажу":
          switch (RailwayConnectionType) {
            case "Внутрішнє":
              TopicDocument.value = 3;
              TopicDocument.text = "Втрата/В";
              break;
            case "Міжнародне":
              TopicDocument.value = 4;
              TopicDocument.text = "Втрата/М";
              break;
          }
          break;

        case "Недостача вантажу":
          switch (RailwayConnectionType) {
            case "Внутрішнє":
              TopicDocument.value = 5;
              TopicDocument.text = "Нестача/В";
              break;
            case "Міжнародне":
              TopicDocument.value = 6;
              TopicDocument.text = "Нестача/M";
              break;
          }
          break;

        case "Псування вантажу":
          switch (RailwayConnectionType) {
            case "Внутрішнє":
              TopicDocument.value = 7;
              TopicDocument.text = "Псування/В";
              break;
            case "Міжнародне":
              TopicDocument.value = 8;
              TopicDocument.text = "Псування/М";
              break;
          }
          break;

        case "Пошкодження вантажу":
          switch (RailwayConnectionType) {
            case "Внутрішнє":
              TopicDocument.value = 9;
              TopicDocument.text = "Пошкодження/В";
              break;
            case "Міжнародне":
              TopicDocument.value = 10;
              TopicDocument.text = "Пошкодження/М";
              break;
          }
          break;
      }
      break;

    case "Некоректне нарахування за перевезення вантажу та надані послуги":
      switch (RailwayConnectionType) {
        case "Внутрішнє":
          TopicDocument.value = 11;
          TopicDocument.text = "Некоректне нарахування/В";
          break;
        case "Міжнародне":
          TopicDocument.value = 12;
          TopicDocument.text = "Некоректне нарахування/М";
          break;
      }
      break;

    case "Інше":
      switch (RailwayConnectionType) {
        case "Внутрішнє":
          TopicDocument.value = 13;
          TopicDocument.text = "Інше/В";
          break;
        case "Міжнародне":
          TopicDocument.value = 14;
          TopicDocument.text = "Інше/М";
          break;
      }

      break;

    default:
      TopicDocument.value = null;
      TopicDocument.text = null;
      break;
  }
  if (init) {
    EdocsApi.setAttributeValue(TopicDocument);
  } else {
    EdocsApi.setAttributeValue({ code: "TopicDocument", value: TopicDocument.value });
  }
}

function onChangeSaveCargoFailureType() {
  setTopicDocument();
}

function setRailwayConnectionTypeForMask() {
  switch (EdocsApi.getAttributeValue("RailwayConnectionType").value) {
    case "Міжнародне":
      EdocsApi.setAttributeValue({ code: "RailwayConnectionTypeForMask", value: "М", text: null });
      break;

    case "Внутрішнє":
      EdocsApi.setAttributeValue({ code: "RailwayConnectionTypeForMask", value: "В", text: null });
      break;
  }
}

function setRequirementTypeForMaskText() {
  EdocsApi.setAttributeValue({ code: "RequirementTypeForMaskText", value: "0", text: null });
}
