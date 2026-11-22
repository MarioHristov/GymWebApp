# Shredded Together

Responsive gym website for six Sofia clubs. The public pages cover locations, membership terms, club events and trainer schedules. Members can register, update their profile and credentials, enroll, reserve or cancel sessions and print their membership history.

## Run the full site

Place this repository next to [GymWebAppApi](https://github.com/MarioHristov/GymWebAppApi). From the API repository, run:

```powershell
$env:FrontendRoot = (Resolve-Path ../GymWebApp).Path
dotnet run --project GymWebApi
```

Open http://localhost:5266. The API serves the static pages and handles requests on the same origin. No frontend build is required.

## Hosting

The Vercel rewrite forwards `/api/*` to the GymWebApi Azure host. Update the destination if the API hostname changes. Use HTTPS and retain the same-origin proxy for session cookies. The map uses the existing browser Maps JavaScript API key in `js/map-config.js`. Enable the Maps JavaScript API and restrict the browser key to the site's allowed referrers. If the map cannot load, filtered club listings remain available.

The API catalog is the source of pricing, schedules, list and map results. Club pages include searchable HTML and refresh club information from the API. All public dates and times refer to Sofia. Enrollment records the amount payable at reception. No payment card is collected.
