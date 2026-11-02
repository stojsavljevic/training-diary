# Training Diary (Dnevnik treninga)

Aplikacija za vođenje dnevnika treninga u teretani, napravljena kao jedna HTML stranica (`index.html`) koja radi kao Claude artifact. Prilagođena je telefonu i tamnoj temi.

## Šta radi

- Beleženje serija (kg i ponavljanja), uvek 3 serije po vežbi
- Tri nedeljna šablona (Ponedeljak PUSH, Sreda MIX, Petak PULL) sa početnim težinama; šabloni se menjaju: težina, ponavljanja, redosled
- Kartice vežbi se mogu premeštati, a završena vežba se skuplja i spušta na dno
- Tajmer pauze (podrazumevano 90 s): upozorenje u poslednjih 10 s, posle nule ide u minus i postaje crven
- Zasebna kartica sa štopericom
- Istorija treninga i grafici napretka po vežbi
- Procena nivoa (Beginner do Elite) iz procenjenog 1RM prema referentnoj tabeli za muškarca od 50 godina; za Dips se procenjuje maksimum ponavljanja, jer se radi sa sopstvenom težinom
- Izvoz i uvoz podataka u JSON (kartica „Podaci" u Istoriji)

## Kako se koristi na drugom Claude nalogu

Aplikacija koristi tri Claude „capabilities" i bez njih ne čuva podatke: `db` (privatno čuvanje po korisniku), `user` (identitet korisnika) i `downloads` (izvoz fajla).

1. Otvori Claude nalog na kome želiš aplikaciju i priloži `index.html` iz ovog repoa.
2. Napiši mu nešto ovako:

   > Objavi priloženi `index.html` kao artifact, bez ikakvih izmena. Obavezno deklariši capabilities: `{"db": {}, "user": {}, "downloads": true}`.

3. Otvori objavljeni artifact. Na prvom pokretanju su podaci prazni, a šabloni se dodaju iz ugrađenih početnih planova.
4. Podatke prenesi ovako:
   - na starom nalogu: **Istorija → Podaci → Izvezi u fajl** (dobijaš `dnevnik-treninga-DATUM.json`)
   - na novom nalogu: **Istorija → Podaci → Uvezi iz fajla**, izaberi taj fajl i potvrdi

Uvoz dodaje samo treninge kojih još nema, a šablone sa istim ID-jem zamenjuje.

## Sopstveni sajt na Cloudflare-u (training.netwatchly.com)

Sajt je Cloudflare Worker (`src/worker.js`, podešavanja u `wrangler.jsonc`). Worker služi `index.html` i API `/api/`, koji čuva podatke u D1 bazi `training-diary`, pa su treninzi, šabloni i podešavanja isti na svim uređajima.

Sajt štiti Cloudflare Access (kartica **Access** na Workeru). API prihvata samo zahteve sa važećim Access tokenom za tu aplikaciju (`ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` u `wrangler.jsonc`), a podaci se vode po emailu iz tokena. Ako se Access isključi, API odbija sve zahteve.

Promene koje nisu stigle do servera čekaju u pregledaču i šalju se čim ima veze (gore desno piše „Čeka slanje“). Podaci koji postoje samo na nekom uređaju, na primer treninzi uneti pre ove verzije, šalju se na server pri prvom otvaranju.

Objava:

```bash
npx wrangler deploy
```

Na sajt idu samo `index.html` i `_headers` (vidi `.assetsignore`).

Lokalno pokretanje, sa lokalnom bazom i bez Access-a:

```bash
npx wrangler dev --local --var DEV_USER:ti@primer.com
```

`DEV_USER` zaobilazi proveru tokena i nikad se ne podešava u produkciji.

## Podaci i privatnost

Repozitorijum sadrži samo kod. Tvoji treninzi su u bazi artifacta na tvom nalogu i u izvoznom JSON fajlu. `.gitignore` sprečava da se izvoz slučajno doda u repo.

## Ograničenja

- Odbrojavanje pauze se ne prikazuje na zaključanom ekranu ni u obaveštenjima (artifacti ne mogu da koriste service worker ni notifikacije)
- Okvir koji Claude postavlja oko artifacta ne može da se ukloni
