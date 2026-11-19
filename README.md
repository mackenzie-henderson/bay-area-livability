# The Neighborhood Tradeoff — Vercel static site

This is the **Eve-updated Neighborhood Tradeoff** dashboard converted from Observable to a standalone static webpage. **No Flask or build step is required.**

## Required: add real datasets

The site will show an explicit loading error until you copy the following files from your Observable notebook into the `data/` directory. Filenames must match **exactly**:

- `data/bay_area_livability_by_zip.csv`
- `data/bay_area_livability_by_zip.geojson`
- `data/bay_area_livability_by_zip_with_rough_coords.csv`

These datasets are not included in the ZIP because they were not uploaded to this conversation. The `.gitkeep` file in `data/` is just a placeholder.

## Upload to GitHub

1. Unzip the package.
2. Add the three data files to the `data` folder.
3. Create a **new GitHub repository** (e.g. `bay-area-livability`).
4. Upload `index.html`, `app.js`, and the complete `data/` folder **to the repository root** (not another nested folder).
5. Commit the files.

## Deploy through Vercel

1. Sign in at https://vercel.com/ and choose **Add New → Project**.
2. Import the new GitHub repository.
3. Choose **Other** as the Framework Preset if asked; leave build command empty and set output directory to `.` if Vercel asks for one.
4. Deploy, and open the generated `*.vercel.app` link.
5. Any future GitHub commits should trigger a new Vercel deployment.

## Test before recruiting participants

- Check the map tiles and ZIP borders align while zooming and panning.
- Confirm selecting a ZIP updates snapshot, scatterplot, and historical rent trend.
- Confirm county filter, opacity slider, reset map, and narrow viewport work.
- Test in an incognito/private window and on a second browser.
- If a CSV/GeoJSON is missing, the site shows an explicit error message with the missing path.

## Implementation note

The webpage uses JavaScript ES modules loaded from jsDelivr, and map imagery from OpenStreetMap. A network connection is needed for those resources. The data files are served directly as static assets and should not contain private information. No server-side API or Flask is used.
