"""
Keeps the unit tests hermetic.

DocumentClassifier() and GroqClient() read GROQ_API_KEY from the environment (via
load_dotenv at import), so with a working key present these tests would make real
Groq calls -- slow, flaky, costly, and dependent on which models an account
happens to have. They are unit tests of the deterministic rule layer, so the key
is cleared for the whole session and the Groq assist path stays disabled.

Production does the same thing deliberately: main.py builds the classifier with
GroqClient(api_key="") because the vision model has already classified the
document and the keyword rules are the independent second signal.
"""

import os

import pytest


@pytest.fixture(autouse=True, scope="session")
def _disable_groq_for_tests():
    saved = os.environ.pop("GROQ_API_KEY", None)
    yield
    if saved is not None:
        os.environ["GROQ_API_KEY"] = saved
