REGULATIONS = {
    "eu_ai_act": {
        "celex": "32024R1689",
        "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32024R1689",
        "name": "EU AI Act",
        "full_name": "Regulation (EU) 2024/1689 - Artificial Intelligence Act",
    },
    "gdpr": {
        "celex": "32016R0679",
        "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679",
        "name": "GDPR",
        "full_name": "Regulation (EU) 2016/679 - General Data Protection Regulation",
    },
    "dora": {
        "celex": "32022R2554",
        "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R2554",
        "name": "DORA",
        "full_name": "Regulation (EU) 2022/2554 - Digital Operational Resilience Act",
    },
}


def main() -> None:
    for key, reg in REGULATIONS.items():
        print(f"{key}: {reg['name']} -> {reg['url']}")


if __name__ == "__main__":
    main()
