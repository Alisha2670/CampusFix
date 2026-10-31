import re
from typing import Tuple, Dict, List
from app.config import settings

class ClassifierService:
    # Category keyword dictionaries with importance weights
    CATEGORY_LEXICON: Dict[str, List[str]] = {
        "Electrical": [
            "wire", "wiring", "socket", "plug", "switch", "light", "lights", "bulb", "tube",
            "fluorescent", "power", "electricity", "breaker", "spark", "sparking", "blackout",
            "voltage", "generator", "projector", "fan", "ac", "air conditioner", "hvac",
            "heater", "inverter", "short circuit", "chiller"
        ],
        "Plumbing": [
            "pipe", "pipes", "leak", "leaking", "leakage", "water", "tap", "faucet", "flush",
            "drain", "drainage", "toilet", "restroom", "washroom", "sink", "sewage", "overflow",
            "puddle", "burst", "clog", "clogged", "blockage", "drip", "dripping"
        ],
        "IT Support": [
            "wifi", "wi-fi", "router", "internet", "network", "lan", "ethernet", "cable",
            "connection", "login", "portal", "software", "computer", "pc", "monitor", "display",
            "mouse", "keyboard", "printer", "server", "audio", "mic", "microphone", "sound"
        ],
        "Housekeeping": [
            "trash", "dustbin", "garbage", "waste", "dirty", "dust", "cleaning", "cleaner",
            "spill", "odor", "smell", "stain", "sweep", "mop", "litter", "hygiene", "pests",
            "cockroach", "rat", "mice", "insect", "muddy"
        ],
        "Infrastructure": [
            "chair", "desk", "bench", "table", "blackboard", "whiteboard", "podium", "door",
            "lock", "handle", "window", "glass", "ceiling", "tile", "tiles", "plaster", "wall",
            "crack", "cracked", "paint", "railing", "staircase", "stairs", "elevator", "lift",
            "roof", "concrete", "hinge"
        ],
    }

    # Urgency risk heuristics
    URGENT_SIGNALS = [
        "fire", "smoke", "burning", "burnt", "spark", "sparking", "electric shock",
        "live wire", "burst", "flooding", "flood", "massive leak", "gas", "collapse",
        "danger", "dangerous", "hazard", "emergency"
    ]

    HIGH_SIGNALS = [
        "exam", "lecture", "blackout", "complete outage", "no water", "broken pipe",
        "sewage", "unusable", "major", "heavy leak", "hot air", "server down"
    ]

    LOW_SIGNALS = [
        "minor", "slight", "squeak", "squeaky", "loose", "cosmetic", "paint", "small stain",
        "scratched", "faint"
    ]

    @classmethod
    def classify_category(cls, text: str, user_selected: str = None) -> Tuple[str, float]:
        """
        Classifies problem text into one of the 5 allowed categories.
        Returns (predicted_category, confidence_score).
        """
        lower_text = text.lower()
        scores: Dict[str, int] = {cat: 0 for cat in settings.ALLOWED_CATEGORIES}

        for cat, keywords in cls.CATEGORY_LEXICON.items():
            for kw in keywords:
                # Match full word or phrase
                if re.search(r'\b' + re.escape(kw) + r'\b', lower_text):
                    scores[cat] += 2
                elif kw in lower_text:
                    scores[cat] += 1

        best_cat = max(scores, key=scores.get)
        max_score = scores[best_cat]

        if max_score > 0:
            total_score = sum(scores.values())
            confidence = round(min(0.95, max(0.55, max_score / total_score)), 2)
            return best_cat, confidence

        # Fallback to user selected category if valid, else Infrastructure
        if user_selected and user_selected in settings.ALLOWED_CATEGORIES:
            return user_selected, 0.50

        return "Infrastructure", 0.50

    @classmethod
    def classify_priority(cls, text: str) -> str:
        """
        Evaluates safety hazard keywords and impact scope to determine priority.
        """
        lower_text = text.lower()

        for signal in cls.URGENT_SIGNALS:
            if re.search(r'\b' + re.escape(signal) + r'\b', lower_text):
                return "Urgent"

        for signal in cls.HIGH_SIGNALS:
            if re.search(r'\b' + re.escape(signal) + r'\b', lower_text):
                return "High"

        for signal in cls.LOW_SIGNALS:
            if re.search(r'\b' + re.escape(signal) + r'\b', lower_text):
                return "Low"

        return "Medium"

    @classmethod
    def analyze_complaint(
        cls,
        title: str,
        description: str,
        user_category: str = None
    ) -> Tuple[str, str, float]:
        """
        Analyzes complaint title and description to predict category, priority, and confidence.
        """
        full_text = f"{title}. {description}"
        category, confidence = cls.classify_category(full_text, user_category)
        priority = cls.classify_priority(full_text)

        return category, priority, confidence

