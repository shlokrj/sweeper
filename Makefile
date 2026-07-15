PYTHON ?= python3
DATASET ?= data/beginner_labels.npz
CHECKPOINT ?= artifacts/cnn.pt
GAMES ?= 20000
EPOCHS ?= 80
BATCH_SIZE ?= 256

.PHONY: install install-train format lint test check generate-data train

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
	$(PYTHON) -m sweeper.models.train --dataset $(DATASET) --checkpoint $(CHECKPOINT) --epochs $(EPOCHS) --batch-size $(BATCH_SIZE)
