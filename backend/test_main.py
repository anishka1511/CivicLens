from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import pytest

import main

client = TestClient(main.app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_chat_missing_body():
    r = client.post("/api/chat", json={})
    assert r.status_code == 422


def test_explain_missing_body():
    r = client.post("/api/explain", json={})
    assert r.status_code == 422


def test_quiz_check_missing_body():
    r = client.post("/api/quiz-check", json={})
    assert r.status_code == 422


def _make_mock_response(text: str):
    return MagicMock(choices=[MagicMock(message=MagicMock(content=text))])


def test_chat_valid():
    with patch("main.has_valid_api_key", return_value=True):
        with patch("main.client.chat.completions.create") as mock_create:
            mock_create.return_value = _make_mock_response("Mock reply")
            r = client.post(
                "/api/chat",
                json={"message": "What is voting?", "history": []},
            )
            assert r.status_code == 200
            data = r.json()
            assert "reply" in data


def test_explain_valid():
    with patch("main.has_valid_api_key", return_value=True):
        with patch("main.client.chat.completions.create") as mock_create:
            mock_create.return_value = _make_mock_response("Mock explanation")
            r = client.post("/api/explain", json={"topic": "Voter Registration"})
            assert r.status_code == 200
            data = r.json()
            assert "explanation" in data


def test_quiz_check_valid():
    with patch("main.has_valid_api_key", return_value=True):
        with patch("main.client.chat.completions.create") as mock_create:
            mock_create.return_value = _make_mock_response("Mock feedback")
            r = client.post(
                "/api/quiz-check",
                json={"question": "Q?", "selected": "A", "correct": "A"},
            )
            assert r.status_code == 200
            data = r.json()
            assert "feedback" in data
