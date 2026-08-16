from .name import normalize_name, compare_names
from .date import normalize_date, is_valid_dob
from .vehicle_number import normalize_vehicle_number, compare_vehicle_numbers

__all__ = [
    "normalize_name",
    "compare_names",
    "normalize_date",
    "is_valid_dob",
    "normalize_vehicle_number",
    "compare_vehicle_numbers",
]
