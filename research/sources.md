# Menu excerpt sources

Three official restaurant menus supply 30 dishes in `sources.json`. Each restaurant has 10 dishes across two or three categories.

| Restaurant | Menu source | Currency | Local evidence |
| --- | --- | --- | --- |
| Dishoom | [Official all-day menu](https://www.dishoom.com/menu/all-day-main/) | GBP | [Selected price lines](dishoom-extract.md) |
| Balthazar, New York | [Official dinner menu](https://balthazarny.com/menus/dinner-menu/) | USD | [Selected price lines](balthazar-extract.md) |
| Pizzeria Bianco, Heritage Square | [Official menu PDF](https://www.pizzeriabianco.com/s/PHXPBMenu_Apr2023.pdf) | USD | [Selected price lines](pizzeria-bianco-extract.md) |

TinyFish retrieved the sources on 2026-10-26. Dish names and numeric prices follow the retrieved official menus. Descriptions are condensed ingredient summaries. Section choices form demo excerpts. Dishoom categories are editorial groupings. The dataset includes no invented allergen claims. Dishoom dietary tags reproduce its printed labels.

The selections are unofficial demo excerpts. They are not endorsed by the restaurants. Prices and availability can change. Dishoom lists an optional 12.5% service charge outside the recorded dish prices.

The Pizzeria Bianco PDF was linked by its [official Heritage Square page](https://www.pizzeriabianco.com/pizzeria-bianco-heritage-square). The PDF filename identifies April 2023. Treat those amounts as a documented snapshot, not guaranteed current prices. The PDF redirects to the Squarespace URL recorded in `provenance.json`. Antipasto is served after 4pm.

Buvette's official menu page returned navigation and a price-change notice but no dish text. Balthazar supplied accessible French menu data instead. The source set contains 35 distinct search-result, fetched, or final-redirect URLs. Navigation links were not counted as reviewed sources.

Currency follows the restaurants' locations and menu context. The Bianco PDF does not print an explicit currency code. The Balthazar page's menu description includes dollar signs. Dishoom's UK menu context supports GBP.

`provenance.json` records fetched source metadata and the URL inventory. `verify-sources.py` verifies the dataset shape, dish counts, IDs, numeric prices, and every selected price against the local source extracts. It does not prove current availability.
