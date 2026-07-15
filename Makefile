PYTHON ?= python3
DATASET ?= data/beginner_labels.npz
CHECKPOINT ?= artifacts/cnn.pt
GAMES ?= 20000
EPOCHS ?= 80
BATCH_SIZE ?= 256
TRAIN_FLAGS ?=
BENCHMARK_GAMES ?= 500
EVALUATION_SEED_START ?= 20000
REPORT ?= artifacts/benchmark.json

.PHONY: install install-train format lint test check generate-data train benchmark

install:
	$(PYTHON) -m pip install -e ".[dev]"

install-train:
	$(PYTHON) -m pip install -e ".[dev,train]"

format:
	$(PYTHON) -m ruff format .

lint:
	$(PYTHON) -m ruff check .

test:
	$(PYTHON) -m pytest

check: lint test

generate-data:
	$(PYTHON) -m sweeper.data --output $(DATASET) --games $(GAMES)

train:
	$(PYTHON) -m sweeper.models.train --dataset $(DATASET) --checkpoint $(CHECKPOINT) --epochs $(EPOCHS) --batch-size $(BATCH_SIZE) $(TRAIN_FLAGS)

benchmark:
	$(PYTHON) -m sweeper.evaluation --checkpoint $(CHECKPOINT) --output $(REPORT) --games $(BENCHMARK_GAMES) --seed-start $(EVALUATION_SEED_START)
