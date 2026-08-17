from pathlib import Path
import pandas as pd
ROOT=Path(__file__).resolve().parents[1]
INPUT=ROOT/'outputs'/'room_training_dataset_v4.csv'
OUTPUT=ROOT/'outputs'/'room_training_dataset_v5.csv'
REMOVED=ROOT/'outputs'/'room_training_dataset_v5_removed.csv'
COUNTS=ROOT/'outputs'/'room_training_dataset_v5_class_counts.csv'
REPORT=ROOT/'outputs'/'room_training_dataset_v5_report.txt'
MIN_SAMPLES=50
LABEL_MERGES={
'Bath':'Bathroom','Bath Shower':'Bathroom',
'Kitchen':'Kitchen','Kitchen Open':'Kitchen','Kitchen Kitchenette':'Kitchen','Kitchen Scullery':'Kitchen',
'Outdoor':'Outdoor Area','Outdoor Balcony':'Outdoor Area','Outdoor Covered Area':'Outdoor Area','Outdoor Garden':'Outdoor Area','Outdoor Porch':'Outdoor Area',
'Entry':'Entry Area','Entry Lobby':'Entry Area','Draught Lobby':'Entry Area',
'Hall':'Hallway','Hall Corridor':'Hallway','Utility Laundry':'Laundry','Undefined':'UNDEFINED'}
AMBIGUOUS_CLASSES={'UNDEFINED','User Defined','Room'}
def main():
    if not INPUT.exists(): raise FileNotFoundError(f'Dataset not found: {INPUT}')
    df=pd.read_csv(INPUT,low_memory=False)
    if 'target_room_type' not in df.columns: raise KeyError("Column 'target_room_type' not found.")
    original_rows=len(df); original_classes=df['target_room_type'].nunique(dropna=True)
    df=df.copy(); df['target_room_type_v4']=df['target_room_type']
    df['target_room_type']=df['target_room_type'].fillna('').astype(str).str.strip().replace(LABEL_MERGES)
    remove_mask=df['target_room_type'].eq('')|df['target_room_type'].isin(AMBIGUOUS_CLASSES)
    removed_initial=df[remove_mask].copy(); kept=df[~remove_mask].copy()
    counts=kept['target_room_type'].value_counts(); rare=set(counts[counts<MIN_SAMPLES].index)
    removed_rare=kept[kept['target_room_type'].isin(rare)].copy(); kept=kept[~kept['target_room_type'].isin(rare)].copy()
    removed=pd.concat([removed_initial,removed_rare],ignore_index=True)
    kept.to_csv(OUTPUT,index=False); removed.to_csv(REMOVED,index=False)
    fc=kept['target_room_type'].value_counts().rename_axis('target_room_type').reset_index(name='sample_count')
    fc['sample_percentage']=fc['sample_count']/len(kept)*100; fc.to_csv(COUNTS,index=False)
    lines=['='*80,'ZYNORA ROOM DATASET V5 REPORT','='*80,f'Input rows: {original_rows}',f'Output rows: {len(kept)}',f'Removed rows: {len(removed)}',f'Original classes: {original_classes}',f"Final classes: {kept['target_room_type'].nunique()}",f'Minimum samples per class: {MIN_SAMPLES}','','Ambiguous classes removed:',*sorted(AMBIGUOUS_CLASSES),'','Rare classes removed after merging:',*(sorted(rare) if rare else ['None'])]
    text='\n'.join(lines); REPORT.write_text(text,encoding='utf-8'); print(text)
if __name__=='__main__': main()
