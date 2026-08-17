from pathlib import Path
import joblib, numpy as np, pandas as pd
from sklearn.ensemble import ExtraTreesClassifier,RandomForestClassifier,VotingClassifier
from sklearn.metrics import accuracy_score,classification_report,confusion_matrix,f1_score,precision_score,recall_score
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import LabelEncoder
ROOT=Path(__file__).resolve().parents[1]; INPUT=ROOT/'outputs'/'room_training_dataset_v5.csv'; MODEL_DIR=ROOT/'outputs'/'models'
MODEL_PATH=MODEL_DIR/'room_classifier_v5.pkl'; ENCODER_PATH=MODEL_DIR/'room_label_encoder_v5.pkl'; FEATURES_PATH=MODEL_DIR/'room_feature_columns_v5.pkl'
REPORT=ROOT/'outputs'/'room_classifier_v5_report.txt'; PREDICTIONS=ROOT/'outputs'/'room_classifier_v5_test_predictions.csv'; IMPORTANCE=ROOT/'outputs'/'room_classifier_v5_feature_importance.csv'; CONFUSION=ROOT/'outputs'/'room_classifier_v5_confusion_matrix.csv'
EXCLUDE={'source_svg','building_id','group_id','room_id','original_room_type','target_room_type','target_room_type_original_v3','target_room_type_v4','predicted_room_type','confidence'}
def choose_split(df):
    all_classes=set(df['target_room_type'].astype(str).unique()); best=None
    for seed in range(42,342):
        tr,te=next(GroupShuffleSplit(n_splits=1,test_size=.2,random_state=seed).split(df,groups=df['group_id'].astype(str)))
        missing=all_classes-set(df.iloc[tr]['target_room_type'].astype(str).unique()); cand=(len(missing),seed,tr,te,missing)
        if best is None or cand[0]<best[0]: best=cand
        if not missing: return seed,tr,te,missing
    return best[1],best[2],best[3],best[4]
def main():
    if not INPUT.exists(): raise FileNotFoundError(f'Dataset not found: {INPUT}')
    MODEL_DIR.mkdir(parents=True,exist_ok=True); df=pd.read_csv(INPUT,low_memory=False)
    missing={'target_room_type','group_id'}-set(df.columns)
    if missing: raise KeyError(f'Missing required columns: {sorted(missing)}')
    features=[c for c in df.select_dtypes(include='number').columns if c not in EXCLUDE]
    if not features: raise ValueError('No numeric features found.')
    seed,tr,te,missing_train=choose_split(df); train=df.iloc[tr].copy(); test=df.iloc[te].copy()
    enc=LabelEncoder().fit(df['target_room_type'].astype(str)); xtr=train[features].replace([np.inf,-np.inf],0).fillna(0); xte=test[features].replace([np.inf,-np.inf],0).fillna(0)
    ytr=enc.transform(train['target_room_type'].astype(str)); yte=enc.transform(test['target_room_type'].astype(str))
    rf=RandomForestClassifier(n_estimators=500,min_samples_split=4,min_samples_leaf=2,max_features='sqrt',class_weight='balanced_subsample',random_state=42,n_jobs=-1)
    et=ExtraTreesClassifier(n_estimators=500,min_samples_split=4,min_samples_leaf=2,max_features='sqrt',class_weight='balanced',random_state=43,n_jobs=-1)
    model=VotingClassifier(estimators=[('rf',rf),('et',et)],voting='soft',n_jobs=-1); model.fit(xtr,ytr)
    pred=model.predict(xte); proba=model.predict_proba(xte); actual=enc.inverse_transform(yte); predicted=enc.inverse_transform(pred)
    cols=[c for c in ['source_svg','building_id','group_id','room_id','original_room_type','target_room_type'] if c in test.columns]
    out=test[cols].copy(); out['actual_room_type']=actual; out['predicted_room_type']=predicted; out['prediction_correct']=out['actual_room_type']==out['predicted_room_type']; out['prediction_confidence']=proba.max(axis=1)
    for i,name in enumerate(enc.classes_): out[f'probability_{name}']=proba[:,i]
    out.to_csv(PREDICTIONS,index=False)
    ids=np.arange(len(enc.classes_)); pd.DataFrame(confusion_matrix(yte,pred,labels=ids),index=enc.classes_,columns=enc.classes_).to_csv(CONFUSION)
    imp=(model.named_estimators_['rf'].feature_importances_+model.named_estimators_['et'].feature_importances_)/2
    pd.DataFrame({'feature':features,'importance':imp}).sort_values('importance',ascending=False).to_csv(IMPORTANCE,index=False)
    joblib.dump(model,MODEL_PATH); joblib.dump(enc,ENCODER_PATH); joblib.dump(features,FEATURES_PATH)
    accuracy=accuracy_score(yte,pred); mp=precision_score(yte,pred,average='macro',zero_division=0); mr=recall_score(yte,pred,average='macro',zero_division=0); mf=f1_score(yte,pred,average='macro',zero_division=0); wf=f1_score(yte,pred,average='weighted',zero_division=0)
    overlap=len(set(train['group_id'].astype(str))&set(test['group_id'].astype(str)))
    cr=classification_report(yte,pred,labels=ids,target_names=enc.classes_,zero_division=0)
    lines=['='*80,'ZYNORA ENSEMBLE V5 REPORT','='*80,f'Total records: {len(df)}',f'Training records: {len(train)}',f'Testing records: {len(test)}',f'Features: {len(features)}',f'Classes: {len(enc.classes_)}',f'Split seed: {seed}',f'Missing training classes: {sorted(missing_train)}',f'Group overlap: {overlap}','','Metrics','-'*80,f'Accuracy: {accuracy:.4f}',f'Macro precision: {mp:.4f}',f'Macro recall: {mr:.4f}',f'Macro F1: {mf:.4f}',f'Weighted F1: {wf:.4f}','','Classification report','-'*80,cr]
    text='\n'.join(lines); REPORT.write_text(text,encoding='utf-8'); print(text)
if __name__=='__main__': main()
