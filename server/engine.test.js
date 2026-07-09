// Self-check del doppio binario. `node server/engine.test.js`
import assert from "node:assert";
import { CHAPTERS, INTRECCI, makeState, applyChoice, optByTag, attractor } from "./engine.js";

const votables = CHAPTERS.filter(c => !c.climax);
assert.equal(votables.length, 12, "devono esserci 12 bivi");

// La sala vota sempre 'facile'; un utente vota sempre 'difficile'.
const collective = makeState();
const personal = makeState();
for (const ch of votables) {
  applyChoice(collective, ch, optByTag(ch, "facile"));
  applyChoice(personal, ch, optByTag(ch, "difficile"));
}

// I due binari divergono agli estremi opposti.
assert.equal(collective.delega, 100, "tutte facili → delega satura a 100");
assert.equal(personal.delega, 0, "tutte difficili → delega a 0");
assert.equal(attractor(collective.delega).name, "Il Pilota Automatico");
assert.equal(attractor(personal.delega).name, "Le Mani sul Volante");
assert.notEqual(attractor(collective.delega).name, attractor(personal.delega).name);

// Gli intrecci scattano sul segno giusto.
const buio = INTRECCI.findIndex(i => i.txt.startsWith("IL BUIO"));
const rete = INTRECCI.findIndex(i => i.txt.startsWith("LA RETE"));
assert.ok(collective.fired.includes(buio), "sala tutta facile → Buio a punteggio");
assert.ok(personal.fired.includes(rete), "utente tutto difficile → Rete di quartiere");
assert.ok(!collective.fired.includes(rete), "un intreccio positivo non scatta sul collettivo tutto-facile");

// L'astenuto non muove il suo stato.
const abst = makeState();
assert.equal(abst.delega, 50);
assert.equal(Object.keys(abst.choices).length, 0);

console.log("OK — doppio binario, intrecci e astensione verificati.");
