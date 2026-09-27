import pytest
from src.data_validation.validate import run_all_validations

def test_data_integrity():
    """
    Runs the full validation suite against the actual data files
    and asserts that there are no errors.
    """
    errors = run_all_validations()
    assert not errors, f"Validation errors found: {errors}"
