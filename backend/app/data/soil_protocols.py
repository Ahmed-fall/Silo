# Reference data for the Soil Scanner's encyclopedia screen, mirroring the
# structure of treatment_protocols.py but for the 4 soil classes returned by
# the ai-soil ConvNeXt model (see ai-soil/README.md).

SOIL_PROTOCOLS: dict[str, dict] = {
    "Alluvial soil": {
        "description": (
            "Deposited by river flooding (notably the Nile in Egypt). Fertile, well-balanced "
            "in minerals, and generally the most productive soil type for wheat and other cereals."
        ),
        "suitable_crops": ["Wheat", "Maize", "Rice", "Sugarcane", "Vegetables"],
        "irrigation_guidance": "Retains moisture well; moderate irrigation frequency. Avoid waterlogging in low-lying fields.",
        "fertilization_guidance": "Naturally fertile — apply balanced NPK based on soil testing rather than heavy blanket fertilization.",
        "risk_notes": "Prone to erosion near riverbanks during flood season; maintain cover cropping where possible.",
    },
    "Black Soil": {
        "description": (
            "Also known as regur or cotton soil. High clay content, rich in calcium carbonate, "
            "magnesium, and lime. Retains moisture exceptionally well but drains slowly."
        ),
        "suitable_crops": ["Cotton", "Wheat", "Sorghum", "Sunflower"],
        "irrigation_guidance": "Retains water for long periods — reduce irrigation frequency to avoid waterlogging and root rot.",
        "fertilization_guidance": "Often nitrogen and phosphorus deficient despite mineral richness; supplement accordingly.",
        "risk_notes": "Cracks deeply when dry, which can damage root systems — monitor soil moisture closely in dry spells.",
    },
    "Clay soil": {
        "description": (
            "Fine particle size, high water and nutrient retention, but poor drainage and aeration. "
            "Compacts easily under heavy machinery or foot traffic."
        ),
        "suitable_crops": ["Wheat", "Rice", "Legumes"],
        "irrigation_guidance": "Low infiltration rate — irrigate slowly and infrequently to prevent surface runoff and waterlogging.",
        "fertilization_guidance": "Nutrient-retentive; avoid over-fertilizing as nutrients don't leach easily and can build up to toxic levels.",
        "risk_notes": "High risk of compaction — avoid working the field when wet, and consider periodic aeration.",
    },
    "Red soil": {
        "description": (
            "Iron oxide gives it a reddish color. Generally lower in fertility, nitrogen, and "
            "organic matter than alluvial or black soils, with lighter texture and good drainage."
        ),
        "suitable_crops": ["Wheat", "Groundnut", "Millet", "Pulses"],
        "irrigation_guidance": "Drains quickly — requires more frequent, lighter irrigation than clay or black soils.",
        "fertilization_guidance": "Often deficient in nitrogen, phosphorus, and humus — organic matter and balanced fertilizer application recommended.",
        "risk_notes": "Susceptible to erosion on sloped land; low water-holding capacity increases drought stress risk.",
    },
}
