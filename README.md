The Neighborhood Tradeoff
An interactive Bay Area livability explorer | UC Berkeley DATA 209

Live website: https://bay-area-livability.vercel.app/
Overview
How does the cost of renting relate to the amenities available in a neighborhood? The Neighborhood Tradeoff invites visitors to explore Bay Area ZIP codes and compare monthly rent, rent changes, and access to everyday amenities. Rather than showing four disconnected charts, the experience connects geography, neighborhood details, and comparisons in one interactive story.

This is an exploratory visualization, not a neighborhood recommendation engine. Associations in these data do not show that amenities cause rents to rise.
Explore the visualization
1. Explore the map. Zoom or pan across the Bay Area. ZIP-code colors indicate the change in average monthly rent from 2022 to 2026; change the ZIP color intensity slider to see the underlying OpenStreetMap labels.
2. Focus your comparison. Zooming the map updates the set of ZIP codes shown in the rent-versus-amenities scatterplot and regional summary statistics. You can also choose a county.
3. Choose a neighborhood. Click a ZIP on the map, click a point in the scatterplot, or enter a ZIP code in the search field. The neighborhood snapshot shows its current monthly rent, rent change, and relative access to six amenity categories: transit, groceries, food and drink, healthcare, education, and recreation.
4. Put the price in context. Use the scatterplot to compare monthly rent against amenities per square mile for ZIP codes in the current map view. The dotted line is a fitted linear trend, not a causal estimate.
5. Explore rent history. The supporting historical chart compares average monthly rent for ZIP codes in low-, medium-, and high-transit-density groups from January 2024 through August 2026. When a ZIP is selected, its history is shown alongside those groups.
Use Clear selection to remove the chosen ZIP, or Reset map to restore the full geographic view. Note that the map's 2022–2026 change period and the history chart's 2024–2026 window are different.
How the views connect
- Map navigation changes the comparison group: ZIPs are included if their geographic centroid falls inside the visible map viewport.
- County filtering restricts the active ZIP codes.
- ZIP selection highlights one neighborhood across the map, profile, scatterplot, and rent-history chart.
- Amenity profile bars are percentile ranks across the full dataset, not measures of walkability, quality, or distance to individual destinations.
- Transit categories are thirds of eligible ZIP codes ranked by transit stops per square mile, defined using the full dataset. The categories remain fixed when the geographic comparison group changes.
Some ZIP codes or values may be missing, and the different source tables may cover different sets of ZIP codes.
Project team
UC Berkeley School of Information — DATA 209
- Eve — ZIP-code geographic rent-change visualization and basemap
- Molly Jenkins — rent history grouped by transit access
- Mackenzie Henderson — rent-versus-amenities analysis, neighborhood amenity exploration, and integrated web experience
The interactive site combines and adapts these views for a shared usability-testing experience.
