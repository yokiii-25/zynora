ZYNORA V5 PIPELINE

Copy files into Y:\YPS-Labs\zynora-ai\scripts

Compile:
python -m py_compile scripts\build_room_dataset_v5.py
python -m py_compile scripts\train_room_classifier_v5.py
python -m py_compile scripts\evaluate_room_classifier_v5.py

Run:
python -m scripts.build_room_dataset_v5
python -m scripts.train_room_classifier_v5
python -m scripts.evaluate_room_classifier_v5
