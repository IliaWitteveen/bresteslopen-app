# BreSteSlopen App – Next.js + Supabase starter

Dit is een starterstructuur voor de interne BreSteSlopen-app.

## Wat zit erin
- Next.js App Router
- eenvoudige dashboardpagina
- project detailpagina
- login placeholder
- mockdata zodat de app direct renderbaar is
- Supabase helperbestanden
- SQL schema voor de MVP-database
- meegeleverd logo in `/public/logo.svg`

## Lokaal starten
1. Installeer dependencies
   - `npm install`
2. Zet `.env.example` om naar `.env.local`
3. Vul je Supabase URL en anon key in
4. Start de app
   - `npm run dev`

## Zonder Supabase
Als je nog geen Supabase gekoppeld hebt, dan werkt de app op mockdata.

## Met Supabase koppelen
1. Maak een nieuw Supabase project aan.
2. Voer `supabase/schema.sql` uit in de SQL editor.
3. Vul je env vars in.
4. Breid `lib/project-repository.ts` uit zodat ook taken, containers, foto's en uitvoerders uit echte tabellen geladen worden.

## Volgende logische stap
- Supabase Auth echt koppelen
- CRUD formulieren server actions geven
- foto-upload naar Supabase Storage
- project_executors, tasks, containers, photos en logboek relationeel inladen
