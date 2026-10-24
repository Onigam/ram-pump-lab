# Hydraulic Ram Lab

An interactive 3D lab of a **hydraulic ram**: a pump with no motor, no electricity and no fuel, that lifts spring water to
a house or a garden much higher up using only the energy of the water that falls to reach it.

**▶ https://ram-pump-lab.vercel.app** · French and English · desktop, tablet and phone

It is the second lab of a series that started with [Pelton Lab](https://github.com/Onigam/pelton-lab) (micro-hydro
electricity), built on the same frame, [lab-kit](https://github.com/Onigam/lab-kit).

## What is in it

- **Four 3D worlds**: the farm **site** (7.5 m of fall, 65 m of lift, a 300 m delivery pipe), the **catchment** (spring box,
  gravel filter, buffer tank), the **ram** and its **waste valve** at workshop scale. Explode, X-ray, isolate, section and
  flow overlays, labels, slow motion.
- **Assembly and installation guides** that follow the build step by step and move from one world to another (the valve is
  made, then fitted on the ram; the site is surveyed, the catchment built, then the pipes laid).
- **A simulation** of the ram (a pure, unit-tested physics model): the video's three waste valves, eight scenarios, the
  cycle frozen and stepped beat by beat, a sizing calculator, and "test" buttons on part sheets.
- **13 A3 design drawings** generated from the same dimensions as the 3D model, **6 short lessons with a quiz**, and a
  catalogue of **44 parts** whose sheets say what each part does, what goes wrong and how to check it.

## What is real and what is not

- This is an **independent educational reconstruction**: not an official drawing, not a product, no footage or image of the
  video is reused.
- The main source is the video _Création clapet de choc pour que notre bélier hydraulique ne s'arrête plus_ by
  [L'énergie partout](https://www.youtube.com/watch?v=mc0gq5rObcM) (2024). Its figures (7.5 m of fall, 65 m of lift, about
  500 L a day, 100–110 strokes a minute with the new valve) are retrieved by the simulation and pinned by unit tests.
- The ram shown is a **generic 1″ ram**, not the Walton n°3 of the video (no maker data was found); only the waste valve
  follows the video. Every figure is tagged _reported_, _derived_, _model result_, _calibrated_, _assumption_ or
  _estimate_; the sources and the reasoning are in [`docs/research.md`](docs/research.md) and
  [`docs/physics.md`](docs/physics.md).
- **Safety and law**: a ram needs a rigid drive pipe and an anchor, and never a finger in the waste valve while it runs.
  Taking water from a source or a stream is regulated (in France, ask the DDT and the OFB), and spring water is not
  guaranteed potable. Nothing here is a plan to build from.

## Run it

```bash
npm install
npm run dev
```

`npm run typecheck && npm run format:check && npm test && npm run build` is what CI runs; every push to `main` deploys to
Vercel. `npm run kit:bump` moves to a newer lab-kit.

## Project layout

- `src/three/` the four worlds and `dims.ts`, the single source of dimensions (metres, each tagged); `src/sim/` the pure
  physics; `src/data/` parts, guides, lessons; `src/drawings/` the A3 sheets; `src/panels/` the simulation panel;
  `src/lab.ts` describes the lab to the kit; `src/part-ids.ts` freezes the 44 part ids shared by all of them.
- `docs/` research notes and sources, physics notes, 3D notes, requests to the kit, review and QA reports; `BRIEF.md` is
  the brief the agent team worked from.

Built with Three.js, TypeScript and Vite (MIT). Credits and links to every source are in the app, in _Sources_.

---

## Français

# Labo du bélier hydraulique

Un lab 3D interactif d'un **bélier hydraulique** : une pompe sans moteur, sans électricité et sans carburant, qui remonte
l'eau d'une source jusqu'à une maison ou un potager bien plus haut, avec la seule énergie de l'eau qui tombe pour y arriver.

**▶ https://ram-pump-lab.vercel.app** · français et anglais · ordinateur, tablette et téléphone

C'est le deuxième lab d'une série commencée avec [Pelton Lab](https://github.com/Onigam/pelton-lab) (micro-hydroélectricité),
construit sur le même cadre, [lab-kit](https://github.com/Onigam/lab-kit).

### Ce qu'il contient

- **Quatre mondes 3D** : le **site** d'une ferme (7,5 m de chute, 65 m de dénivelé, 300 m de conduite de refoulement), le
  **captage** (regard, filtre à gravier, réserve tampon), le **bélier** et son **clapet de choc** à l'échelle de l'atelier.
  Éclaté, transparence, isolement, coupe, flux, étiquettes, ralenti.
- **Des guides de montage et d'installation** qui suivent la construction pas à pas et passent d'un monde à l'autre.
- **Une simulation** du bélier (un modèle physique pur, testé) : les trois clapets de la vidéo, huit scénarios, le cycle
  figé et parcouru temps par temps, un calculateur de dimensionnement et des boutons « tester » sur les fiches.
- **13 plans A3** générés à partir des cotes du modèle 3D, **6 leçons courtes avec quiz**, et un catalogue de **44 pièces**
  dont les fiches disent ce que fait chaque pièce, ce qui peut mal tourner et comment le vérifier.

### Ce qui est vrai et ce qui ne l'est pas

- C'est une **reconstitution pédagogique indépendante** : pas un plan officiel, pas un produit, aucune image de la vidéo
  n'est reprise.
- La source principale est la vidéo _Création clapet de choc pour que notre bélier hydraulique ne s'arrête plus_ de
  [L'énergie partout](https://www.youtube.com/watch?v=mc0gq5rObcM) (2024). Ses chiffres (7,5 m de chute, 65 m de dénivelé,
  environ 500 L par jour, 100 à 110 coups par minute avec le nouveau clapet) sont retrouvés par la simulation et vérifiés
  par des tests.
- Le bélier montré est un **bélier générique de 1″**, pas le Walton n°3 de la vidéo (aucune fiche du constructeur n'a été
  trouvée) ; seul le clapet de choc suit la vidéo. Chaque chiffre est étiqueté _relevé_, _dérivé_, _résultat du modèle_,
  _calibré_, _hypothèse_ ou _estimation_ ; les sources et le raisonnement sont dans [`docs/research.md`](docs/research.md)
  et [`docs/physics.md`](docs/physics.md).
- **Sécurité et loi** : un bélier demande une conduite motrice rigide et un ancrage, et jamais un doigt dans le clapet de
  choc quand il tourne. Prélever l'eau d'une source ou d'un cours d'eau est réglementé (en France, renseignez-vous auprès
  de la DDT et de l'OFB), et l'eau d'une source n'est pas garantie potable. Rien ici n'est un plan à réaliser.

### Lancer en local

`npm install` puis `npm run dev`. La CI lance `npm run typecheck && npm run format:check && npm test && npm run build` ;
chaque push sur `main` déploie sur Vercel. `npm run kit:bump` passe à une version plus récente de lab-kit.
