from pathlib import Path
import pandas as pd
from sklearn.metrics import accuracy_score,f1_score,precision_score,recall_score
ROOT=Path(__file__).resolve().parents[1]; INPUT=ROOT/'outputs'/'room_classifier_v5_test_predictions.csv'; OUTDIR=ROOT/'outputs'/'evaluation_v5'
def main():
    if not INPUT.exists(): raise FileNotFoundError(f'Predictions file not found: {INPUT}')
    OUTDIR.mkdir(parents=True,exist_ok=True); df=pd.read_csv(INPUT,low_memory=False)
    missing={'actual_room_type','predicted_room_type'}-set(df.columns)
    if missing: raise KeyError(f'Missing required columns: {sorted(missing)}')
    actual=df['actual_room_type'].astype(str); predicted=df['predicted_room_type'].astype(str); rows=[]
    for name in sorted(set(actual)|set(predicted)):
        a=actual==name; p=predicted==name; tp=int((a&p).sum()); support=int(a.sum()); pc=int(p.sum()); precision=tp/pc if pc else 0; recall=tp/support if support else 0; f1=2*precision*recall/(precision+recall) if precision+recall else 0
        rows.append({'target_room_type':name,'support':support,'predicted_count':pc,'precision':precision,'recall':recall,'f1_score':f1})
    pd.DataFrame(rows).sort_values(['f1_score','support'],ascending=[True,False]).to_csv(OUTDIR/'per_class_metrics.csv',index=False)
    bad=actual!=predicted; pairs=df.loc[bad].groupby(['actual_room_type','predicted_room_type']).size().reset_index(name='count').sort_values('count',ascending=False); pairs.to_csv(OUTDIR/'top_confusion_pairs.csv',index=False)
    if 'group_id' in df.columns:
        t=df.copy(); t['prediction_correct']=actual==predicted; t.groupby('group_id')['prediction_correct'].mean().reset_index(name='accuracy').sort_values('accuracy').to_csv(OUTDIR/'per_building_accuracy.csv',index=False)
    acc=accuracy_score(actual,predicted); mp=precision_score(actual,predicted,average='macro',zero_division=0); mr=recall_score(actual,predicted,average='macro',zero_division=0); mf=f1_score(actual,predicted,average='macro',zero_division=0); wf=f1_score(actual,predicted,average='weighted',zero_division=0)
    lines=['='*80,'ZYNORA V5 ERROR ANALYSIS','='*80,f'Test records: {len(df)}',f'Accuracy: {acc:.4f}',f'Macro precision: {mp:.4f}',f'Macro recall: {mr:.4f}',f'Macro F1: {mf:.4f}',f'Weighted F1: {wf:.4f}','','Top confusion pairs','-'*80,pairs.head(20).to_string(index=False)]
    text='\n'.join(lines); (OUTDIR/'evaluation_report.txt').write_text(text,encoding='utf-8'); print(text)
if __name__=='__main__': main()
