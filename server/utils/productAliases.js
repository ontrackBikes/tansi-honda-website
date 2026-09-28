// Words customers actually type for each model on WhatsApp — nicknames, old
// model names, short forms, common misspellings and Hinglish. Keyed by Bike
// slug. Used by GET /api/ai/catalog?mode=index.
//
// Only list what can't be derived from the model name: "shine 125",
// "shine125", "honda shine 125" etc. are generated automatically. The first
// entry is the model's main nickname and is combined with variant names
// ("activa" + "DLX" → "activa dlx").
//
// Models missing from this map (e.g. added later via the admin) still get the
// generated aliases.

module.exports = {
  // ---------- Scooters ----------
  "honda-activa-110": [
    "activa",
    "activa 6g",
    "6g",
    "activa 110cc",
    "activa scooty",
    "new activa",
    "activa petrol",
  ],
  "honda-activa-110-anniversary-edition": [
    "activa anniversary",
    "activa 6g anniversary",
    "activa anniversary edition",
    "activa special edition",
  ],
  "honda-activa-125": [
    "activa 125",
    "activa 125cc",
    "activa 125 scooty",
    "activa h smart",
    "activa smart key",
  ],
  "honda-activa-125-anniversary-edition": [
    "activa 125 anniversary",
    "activa 125 special edition",
  ],
  "honda-dio-110": ["dio", "dio 110cc", "dio scooty", "dio scooter"],
  "honda-dio-125": ["dio 125", "dio 125cc", "dio h smart", "dio smart key"],
  "honda-dio-125-x-edition": ["dio x", "dio x edition", "dio 125 x"],

  // ---------- Electric ----------
  "honda-activa-ev": [
    "activa e",
    "activa e:",
    "activa electric",
    "electric activa",
    "e activa",
    "activa ev",
    "ev activa",
    "battery activa",
    "activa battery wali",
    "battery wali activa",
    "ev scooty",
    "electric scooty",
    "battery scooty",
    "battery wali scooty",
    "swappable battery scooter",
    "battery swap scooty",
    "honda ev",
    "honda electric",
  ],
  "honda-activa-qc1": [
    "qc1",
    "qc 1",
    "activa qc1",
    "activa qc 1",
    "qc1 ev",
    "ev scooty",
    "electric scooty",
    "battery scooty",
    "battery wali scooty",
    "charging wali scooty",
    "ghar pe charge wali scooty",
    "home charging scooter",
    "sasta ev",
    "honda ev",
    "honda electric",
  ],

  // ---------- Commuter motorcycles ----------
  "honda-shine-100": [
    "shine 100",
    "shine",
    "shine 100cc",
    "new shine",
    "shine bike",
    "100cc shine",
  ],
  "honda-shine-100-dx": [
    "shine dx",
    "shine 100 dx",
    "shine deluxe",
    "shine 100 deluxe",
  ],
  "honda-shine-125": [
    "shine",
    "shine 125cc",
    "cb shine",
    "honda cb shine",
    "shine bike",
  ],
  "honda-shine-125-limited-edition": [
    "shine limited edition",
    "shine le",
    "shine 125 le",
    "shine 125 limited",
  ],
  "honda-livo": ["livo", "livo 110", "livo bike", "lvo"],
  "honda-sp-125": [
    "sp",
    "sp125",
    "sp 125cc",
    "shine sp",
    "cb shine sp",
    "sp bike",
  ],
  "honda-sp-125-anniversary-edition": [
    "sp anniversary",
    "sp 125 anniversary",
    "sp125 anniversary",
    "sp special edition",
  ],
  "honda-sp-160": ["sp160", "sp 160cc", "sp 160 bike"],
  "honda-unicorn": ["unicorn", "unicorn 160", "unicon", "unikorn", "unicorn bike"],
  "honda-cb125-hornet": [
    "hornet 125",
    "cb 125 hornet",
    "cb125",
    "hornet",
    "new hornet",
  ],

  // ---------- Premium / BigWing ----------
  "honda-hornet-2.0": [
    "hornet 2",
    "hornet 2.0",
    "hornet 184",
    "hornet 180",
    "cb hornet",
    "hornet",
  ],
  "honda-hornet-750": ["hornet 750", "cb750 hornet", "cb 750", "cb750"],
  "honda-hornet-100-sp": [
    "hornet 1000",
    "hornet 1000 sp",
    "cb1000 hornet",
    "cb1000",
    "hornet sp",
  ],
  "honda-nx200": ["nx200", "nx 200", "cb200x", "cb 200x", "200x"],
  "honda-nx500-e-clutch": ["nx500", "nx 500", "nx500 eclutch", "nx e clutch"],
  "honda-xl750-transalp": [
    "transalp",
    "xl750",
    "xl 750",
    "transalp 750",
    "trans alp",
  ],
  "honda-goldwing-tour": ["goldwing", "gold wing", "gl1800", "goldwing tour"],
  "honda-cb300f": ["cb300f", "cb 300f", "cb300", "300f", "cb300f flex fuel"],
  "honda-cb350": ["cb350", "cb 350", "cb350 dlx", "cb 350 bike"],
  "honda-cb350c": ["cb350c", "cb 350c", "cb350 c"],
  "honda-cb350c-special-edition": [
    "cb350c special",
    "cb350c special edition",
    "cb350c se",
  ],
  "honda-cb350-hness": [
    "hness",
    "h'ness",
    "highness",
    "cb350 hness",
    "cb 350 hness",
    "honda highness",
    "hness 350",
    "highness 350",
  ],
  "honda-cb350rs": ["cb350rs", "cb350 rs", "cb 350 rs", "rs 350", "rs350"],
  "honda-adv160": ["adv", "adv 160", "adv160", "adventure scooter"],
  "honda-rebel-300": ["rebel", "rebel 300", "rebel300", "rebel cruiser"],
};
