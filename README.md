# The Neighborhood Tradeoff

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
