# Istorija izmena

Stare verzije (1 do 16) nisu sačuvane kao posebni commitovi; ovo je pregled onoga što je ušlo u aplikaciju do sada.

## Verzija 22
- Pregled šablona prikazuje kilažu svake vežbe umesto serija × ponavljanja (serija je uvek 3); za Dips ostaje broj ponavljanja

## Verzija 21
- Tajmer pauze ostaje posle odlaska sa stranice ili ponovnog učitavanja (npr. dugme Home u Chrome-u) i nastavlja da odbrojava
- Pauza koja je istekla dok stranica nije bila otvorena prikazuje se kao „Pauza prošla“, bez zvuka

## Verzija 20
- Zapis koji server odbije više ne blokira slanje ostalih izmena; pojavljuje se poruka, a zapis ostaje samo na uređaju
- Server i aplikacija proveravaju oblik serija (kg i ponavljanja), pa pokvaren zapis ne može da obori prikaz
- Vrednosti serija se u Istoriji i Napretku prikazuju bezbedno (kao tekst)

## Verzija 19
- Sinhronizacija preko sopstvenog servera (Cloudflare Worker + D1, zaštita Cloudflare Access): isti treninzi, šabloni i podešavanja na svim uređajima
- Promene se čuvaju u redu za slanje dok server ne potvrdi; podaci koji postoje samo na uređaju šalju se na server; obrisano na jednom uređaju briše se i na ostalima
- Oznaka stanja čuvanja u zaglavlju
- Izvoz u fajl radi i van Claude-a

## Verzija 18
- Ispravan prikaz srpskih slova i prikaz na telefonu kada se stranica otvara van Claude-a (doctype, UTF-8, viewport)

## Verzija 17
- Izvoz i uvoz podataka (treninzi i šabloni) u JSON fajl

## Verzije 1 do 16
- Početna PWA aplikacija: beleženje serija, šabloni, istorija, grafici, tajmer pauze
- Tri šablona sa početnim težinama (Ponedeljak PUSH, Sreda MIX, Petak PULL), uvek 3 serije
- Zasebna kartica sa štopericom (krugovi)
- Premeštanje kartica vežbi, skupljanje i spuštanje završenih vežbi na dno
- Tema „Šuma" (zelena, tamna), manje kartice i font
- Tajmer pauze: crven ispod nule, upozorenje u poslednjih 10 s, deblja traka, posebna kartica
- Polje za ponavljanja uz težinu (jedna vrednost za sve serije), izmena težine i ponavljanja u šablonima
- Čuvanje podataka u nalogu (db), sa lokalnom kopijom na uređaju
- Isticanje samo prve vežbe na vrhu
- Napredak: nivoi vežbi (Beginner do Elite) iz referentne 1RM tabele, pregled nivoa
- Dips: nivo iz procenjenog maksimuma ponavljanja (3×6, prve dve serije oko 85%, poslednja do otkaza)
