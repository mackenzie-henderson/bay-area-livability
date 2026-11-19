# The Neighborhood Tradeoff

**An interactive Bay Area livability explorer | UC Berkeley DATA 209**

**Live website:** https://bay-area-livability.vercel.app/

## Overview

How does the cost of renting relate to the amenities available in a neighborhood? **The Neighborhood Tradeoff** invites visitors to explore Bay Area ZIP codes and compare monthly rent, rent changes, and access to everyday amenities. Rather than showing four disconnected charts, the experience connects geography, neighborhood details, and comparisons in one interactive story.

This is an exploratory visualization, **not** a neighborhood recommendation engine. Associations in these data do not show that amenities cause rents to rise.

## Explore the visualization

1. **Explore the map.** Zoom or pan across the Bay Area. ZIP-code colors indicate the change in average monthly rent from **2022 to 2026**; change the **ZIP color intensity** slider to see the underlying OpenStreetMap labels.
2. **Focus your comparison.** Zooming the map updates the set of ZIP codes shown in the rent-versus-amenities scatterplot and regional summary statistics. You can also choose a county.
3. **Choose a neighborhood.** Click a ZIP on the map, click a point in the scatterplot, or enter a ZIP code in the search field. The neighborhood snapshot shows its current monthly rent, rent change, and relative access to six amenity categories: transit, groceries, food and drink, healthcare, education, and recreation.
4. **Put the price in context.** Use the scatterplot to compare monthly rent against amenities per square mile for ZIP codes in the current map view. The dotted line is a fitted linear trend, not a causal estimate.
5. **Explore rent history.** The supporting historical chart compares average monthly rent for ZIP codes in low-, medium-, and high-transit-density groups from **January 2024 through August 2026**. When a ZIP is selected, its history is shown alongside those groups.

Use **Clear selection** to remove the chosen ZIP, or **Reset map** to restore the full geographic view. Note that the map's 2022–2026 change period and the history chart's 2024–2026 window are different.

## How the views connect

- **Map navigation** changes the comparison group: ZIPs are included if their geographic centroid falls inside the visible map viewport.
- **County filtering** restricts the active ZIP codes.
- **ZIP selection** highlights one neighborhood across the map, profile, scatterplot, and rent-history chart.
- **Amenity profile bars** are percentile ranks across the full dataset, not measures of walkability, quality, or distance to individual destinations.
- **Transit categories** are thirds of eligible ZIP codes ranked by transit stops per square mile, defined using the full dataset. The categories remain fixed when the geographic comparison group changes.

Some ZIP codes or values may be missing, and the different source tables may cover different sets of ZIP codes.

## Project team

UC Berkeley School of Information — DATA 209

- Eve — ZIP-code geographic rent-change visualization and basemap
- Molly Jenkins — rent history grouped by transit access
- Mackenzie Henderson — rent-versus-amenities analysis, neighborhood amenity exploration, and integrated web experience

The interactive site combines and adapts these views for a shared usability-testing experience.

## Technology

- **D3.js** and **d3-tile** for charts, geographic interaction, and map tiles
- **OpenStreetMap** tiles for geographic context (© OpenStreetMap contributors)
- **HTML, CSS, and vanilla JavaScript** for the standalone interface
- **GitHub + Vercel** for source hosting and static-site deployment

No Flask application, backend API, or JavaScript build step is required. The website loads public static datasets and the D3 libraries in the browser. An internet connection is required for the basemap and external JavaScript modules.

## Repository structure

```text
bay-area-livability/
├── index.html
├── app.js
├── README.md
└── data/
    ├── bay_area_livability_by_zip.csv
    ├── bay_area_livability_by_zip.geojson
    └── bay_area_livability_by_zip_with_rough_coords.csv
```

**Important:** The three files in `data/` must use these exact names. They are not included in the original starter package; download them from the team's Observable notebook and include them in the deployed repository. Check that data files are suitable for public publication before uploading.

## Run and deploy

1. Put `index.html`, `app.js`, `README.md`, and `data/` at the **repository root**.
2. To preview locally, start a static HTTP server from the repository directory (for example, `python3 -m http.server 8000`), then visit `http://localhost:8000`. Do not open `index.html` directly via `file://`, since the browser must fetch the data files.
3. Push the project to GitHub.
4. Import the repository into [Vercel](https://vercel.com/new), selecting **Other** as the framework if needed. No build command is necessary; use the repository root as the output directory when prompted.
5. After changes are committed, confirm Vercel has deployed the latest commit, then open the [live site](https://bay-area-livability.vercel.app/).

### Troubleshooting

- **Map tiles absent:** Verify connectivity to OpenStreetMap; the other charts can still use the loaded data.
- **Blank dashboard:** Open browser developer tools to inspect module-loading and JavaScript errors; verify that all three files are readable URLs.
- **Old changes still showing:** Confirm the newest GitHub commit completed its Vercel deployment, then hard-refresh the page.

## Data and interpretation

The visualization uses the team's Bay Area livability ZIP-code data, including Zillow-derived rental measures and amenity densities. The map uses rent-change fields in the supplementary coordinates dataset; the neighborhood snapshot and scatterplot use `Current_ZORI` and `Amenities_Per_Sq_Mile` from the main CSV. For historical averages, only valid monthly rent values are included. Different measures and time windows should not be treated as interchangeable.

The map and charts are descriptive and do not account for every factor affecting housing prices. ZIP-code boundaries and aggregated amenity densities are approximations of neighborhood conditions, not individual rental listings or walking-access estimates.

---

*UC Berkeley School of Information · DATA 209 · Bay Area Livability Explorer*
