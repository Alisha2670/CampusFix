from fastapi.testclient import TestClient
from app.main import app
from app.services.classifier_service import ClassifierService
from app.services.duplicate_service import DuplicateService
from app.schemas.analysis_schema import DuplicateCandidateInput

def test_category_and_priority_classifier():
    # 1. Electrical & Urgent
    cat, prio, conf = ClassifierService.analyze_complaint(
        "Sparks from wall socket",
        "There is smoke and sparks coming out of the outlet, severe fire hazard!"
    )
    assert cat == "Electrical"
    assert prio == "Urgent"
    assert conf >= 0.60

    # 2. Plumbing & High
    cat, prio, conf = ClassifierService.analyze_complaint(
        "Heavy pipe leak",
        "Massive water leakage from the ceiling pipe flooding the corridor."
    )
    assert cat == "Plumbing"
    assert prio in ["High", "Urgent"]

    # 3. IT Support
    cat, prio, conf = ClassifierService.analyze_complaint(
        "Wi-Fi connection down",
        "The router in reading room is offline, no internet access."
    )
    assert cat == "IT Support"

    # 4. Low priority cosmetic
    cat, prio, conf = ClassifierService.analyze_complaint(
        "Squeaky door hinge",
        "Minor squeaking sound when opening the study room door."
    )
    assert prio == "Low"

def test_semantic_duplicate_detection():
    # Candidates in the same building
    candidates = [
        DuplicateCandidateInput(
            complaintId="FC-PREV-01",
            title="Water pipe burst under sink",
            description="Flooding under the sink in chemistry lab, water pooling rapidly.",
            category="Plumbing",
            status="In Progress"
        ),
        DuplicateCandidateInput(
            complaintId="FC-PREV-02",
            title="Broken chair leg",
            description="The wooden chair in room 201 has a cracked leg.",
            category="Infrastructure",
            status="Submitted"
        )
    ]

    # New incoming complaint semantically similar to FC-PREV-01
    duplicates = DuplicateService.find_duplicates(
        new_title="Sink pipe leaking badly",
        new_description="Major water pooling from pipe underneath the lab sink.",
        candidates=candidates,
        threshold=0.70
    )

    assert len(duplicates) == 1
    assert duplicates[0].complaintId == "FC-PREV-01"
    assert duplicates[0].similarity >= 0.70

def test_analyze_api_endpoint():
    with TestClient(app) as client:
        payload = {
            "complaint": {
                "complaintId": "FC-NEW-101",
                "title": "Wi-Fi router dead in library",
                "description": "No internet access on 2nd floor, access point light is red.",
                "category": "IT Support"
            },
            "candidates": [
                {
                    "complaintId": "FC-CAND-01",
                    "title": "Library internet offline",
                    "description": "Wi-Fi network is not working in the library hall.",
                    "category": "IT Support",
                    "status": "Submitted"
                },
                {
                    "complaintId": "FC-CAND-02",
                    "title": "Water cooler not working",
                    "description": "Cold water tap broken in lobby.",
                    "category": "Plumbing",
                    "status": "Resolved"
                }
            ]
        }

        response = client.post("/analyze", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["suggestedCategory"] == "IT Support"
        assert len(data["possibleDuplicates"]) >= 1
        assert data["possibleDuplicates"][0]["complaintId"] == "FC-CAND-01"
        assert data["possibleDuplicates"][0]["similarity"] >= 0.65
