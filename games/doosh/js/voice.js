/* Stick Doosh - SGS.Voice
 * Line catalogue (SINGLE SOURCE OF TRUTH: tools/tts/export_lines.js dumps it to tools/tts/lines.json for Kokoro),
 * chatter control, speech bubbles and mp3 playback with curse bleeping.
 * Curse words are written in braces: "Eat {shit}, stick boy!". Bleep mode (default) shows a grawlix (@#$%) in the
 * bubble and, if an mp3 exists, mutes the voice over the word's [start,end] seconds (from the manifest) and plays a
 * 1 kHz beep. Uncensored mode ('raw') shows and plays the word. Lines work bubble-only when no mp3 exists.
 * Line id = "<speaker>/<event>_<n>" = path under assets/vo/ without ".mp3". */
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};

  const THEMES = ['ice', 'fire', 'wind', 'water', 'mud', 'jungle', 'mountain', 'plains', 'fantasy', 'moon', 'retro', 'fortress'];
  const HEROES = ['sgt', 'pete', 'brenda', 'major', 'gramps'];

  /* ------------------------------------------------------------------ catalogue */
  const LINES = {
    sgt: {
      spawn: ["Sergeant Doosh, reporting for DOOSH!", "Did somebody order a DOOSH?", "I'm back, and my hair is perfect.", "Time to get my DOOSH on."],
      kill: ["Doosh'd.", "Hasta la vista, stick boy.", "That's gonna leave a mark.", "Eat {shit}, stick boy!", "Another one bites the dust. Because I shot it.", "Bye bye, buddy."],
      multikill: ["I'm on a roll!", "Who's next?!", "Is that all you got?!", "Doosh, doosh, doosh, DOOSH!"],
      pickup: ["Now we're talking!", "Oh, hello gorgeous.", "Come to papa!"],
      hurt: ["Ow! That was my good arm!", "My pompadour!", "I felt that in my hair.", "{Damn}, that stings!"],
      low_hp: ["I've had worse. Not much worse.", "Tell my hair I loved it."],
      die: ["Tell my mom I'm out of lives!", "I'll be back. After a respawn.", "Not the pompadour! Aaaargh!", "Tell the shotgun I love her."],
      rescue: ["You're welcome, buddy!", "Never leave a stick behind!", "Welcome back, you absolute legend."],
      flag: ["Checkpoint secured.", "Hoisting the flag of freedom. And snacks."],
      explode: ["Boom!", "I love the smell of explosions in the morning."],
      gold: ["Cha-ching, baby.", "Shiny!"],
      idle: ["Are we there yet?", "I should've brought snacks.", "Anyone hear that? Me neither."],
      level_start: ["Let's go kick some stick!", "Operation Doosh begins now."],
      level_clear: ["Mission accomplished. Mostly.", "Another day, another dollar, another explosion."],
      level_fail: ["Well, {damn}."]
    },
    pete: {
      spawn: ["Yeehaw! Pew pew pew!", "Howdy, y'all! Pete's in the house!", "Saddle up, partner!", "I'm little, but my guns are loud!"],
      kill: ["Pew pew, varmint!", "Yeehaw!", "Nobody calls me short and lives!", "Draw, partner! Oh. Too late.", "Giddy up and get dead!"],
      multikill: ["Reload? I don't need to reload!", "Look at me go! Pew pew pew pew!", "That's a whole lotta pew!"],
      pickup: ["Well, hot diggity!", "Ooh, shiny!", "Gimme gimme gimme!"],
      hurt: ["Ouch! My hat!", "Yeow! That's my mustache!", "Dagnabbit!", "Ow ow ow ow!"],
      low_hp: ["I'm too pretty to die!", "Mama, I need a hug!"],
      die: ["Tell my horse I love him!", "I'm meeeelting! Wait, wrong movie.", "Adios, amigos!", "Aw, {crap}!"],
      rescue: ["Thank ya kindly, partner!", "Yeehaw, I found a friend!", "Come on, we're burnin' daylight!"],
      flag: ["Flag's up, y'all!", "Checkpoint! Time for a tiny nap!"],
      explode: ["Kaboom, y'all!", "Whoa, that's a big bang for a little guy!"],
      gold: ["Gold! Mine, mine, mine!", "Cha-ching, cowboy!"],
      idle: ["Is this thing on?", "I'm so bored I could eat my hat.", "Pew. Pew. Pew. Just practicing."],
      level_start: ["High noon, y'all!", "Let's ride, partner!"],
      level_clear: ["Another one in the saddle!", "That was a hoot and a half!"],
      level_fail: ["Aw, shucks."]
    },
    brenda: {
      spawn: ["BRENDA IS IN THE BUILDING!", "WHO'S READY TO SWEAT?!", "LET'S GET PUMPED!", "IT'S LEG DAY, EVERYBODY!"],
      kill: ["DROP AND GIVE ME TWENTY!", "NO PAIN, NO GAIN!", "SQUATS FOR EVERYBODY!", "GET YOUR {ASS} MOVING!", "TOO SLOW, MAGGOT!"],
      multikill: ["THAT'S WHAT I'M TALKING ABOUT!", "FEEL THE BURN, BABY!", "DOUBLE REPS, TRIPLE KILLS!"],
      pickup: ["MORE WEIGHT! I LOVE IT!", "NOW THAT'S A WORKOUT!", "HAND IT OVER!"],
      hurt: ["OW! WHO PUT THAT THERE?!", "THAT'S JUST A FLESH WOUND! A BIG ONE!", "I CAN WALK IT OFF!", "{DAMN}, THAT HURT!"],
      low_hp: ["I DON'T FEEL SO GOOD!", "PUSH THROUGH THE PAIN, BRENDA!"],
      die: ["I SKIPPED BREAKFAST!", "TELL MY PROTEIN SHAKE I LOVE HIM!", "NO! MY BICEPS!", "I FORGOT TO STRETCH!"],
      rescue: ["UP AND AT 'EM, CHAMP!", "YOU'RE ON MY TEAM NOW, SOLDIER!", "WELCOME TO BOOT CAMP!"],
      flag: ["WATER BREAK! FIVE SECONDS!", "CHECKPOINT! GET YOUR HEART RATE UP!"],
      explode: ["KABOOM, BABY!", "THAT'S A CARDIO BLAST!"],
      gold: ["GAINS! I LOVE GAINS!", "GOLD STAR FOR ME!"],
      idle: ["WHY ARE WE STANDING AROUND?! MOVE!", "I'M GETTING COLD OVER HERE!", "LET'S GO, LET'S GO, LET'S GO!"],
      level_start: ["WARM UP IS OVER, PEOPLE!", "GAME FACE ON, LET'S GO!"],
      level_clear: ["THAT'S A WRAP! GREAT SESSION, TEAM!", "NEW PERSONAL BEST!"],
      level_fail: ["WE WILL TRAIN HARDER!"]
    },
    major: {
      spawn: ["Major Shhh, reporting. Do keep it down.", "Shhh. The enemy is napping.", "Right-o, chaps. Tally ho.", "Jolly good. Shall we?"],
      kill: ["Shhh. Sleep tight.", "Terribly sorry, old chap.", "Jolly good shot, if I do say so myself.", "Frightfully rude of you to stand there.", "Shhh. No need to make a fuss."],
      multikill: ["I say! What a spectacular mess!", "Splendid! Absolutely splendid!", "Do try to keep up, chaps."],
      pickup: ["How frightfully generous.", "Oh, a present! Shhh!", "Marvellous. Simply marvellous."],
      hurt: ["I say! Rather uncivilised!", "Oh, {bugger}.", "Ooh, that stung a bit.", "Blast! My monocle!"],
      low_hp: ["Shhh. Do not panic. Panic quietly.", "I may be a tad bit dead soon."],
      die: ["Tell the Queen I was punctual.", "Shhh... it's rather peaceful actually.", "Oh, {bollocks}.", "Terribly sorry. Must dash. To the afterlife."],
      rescue: ["Jolly good to see you, old bean!", "Shhh. Rescue in progress.", "Welcome back, chap. Tea?"],
      flag: ["Shhh. Flag erected. Do admire.", "Checkpoint reached. Time for tea."],
      explode: ["Shhhhhh... BOOM.", "That was rather loud. My apologies."],
      gold: ["Ooh, a few quid!", "Splendid, pocket money."],
      idle: ["Shhh. Do you hear that? No? Quite.", "I do wish someone would bring tea.", "Shhh. I'm thinking. Quietly."],
      level_start: ["Shhh. Stealth is the name of the game. Mostly.", "Chaps, let us proceed. Quietly."],
      level_clear: ["Another one in the bag. Shhh.", "Jolly good show, everyone."],
      level_fail: ["Shhh. We shall never speak of this."]
    },
    gramps: {
      spawn: ["Get off my lawn!", "Back in my day, we had two dimensions!", "What's all this ruckus?", "I'm too old for this {crap}."],
      kill: ["Bah! Kids these days!", "Respect your elders!", "Take that, whippersnapper!", "Back in my day, we shot them with rocks.", "Whoops, my hand slipped."],
      multikill: ["I've still got it!", "Whee! Look at me go!", "Not bad for a man of ninety-seven!"],
      pickup: ["Is this my prescription?", "Ooh, a flamethrower! Just like the war!", "Finders keepers, sonny."],
      hurt: ["My hip!", "Ow! My dentures!", "My back! My other back!", "{Damn} kids!"],
      low_hp: ["Call my nurse!", "I'm too old for this."],
      die: ["Tell my cat I loved her.", "I'm having my own episode.", "I see the light! Oh, wait, it's a lamp.", "Where are my teeth?!"],
      rescue: ["Well, don't just stand there, help an old man!", "Thank goodness, I needed someone to carry my bags.", "Hurry up, I'm not getting any younger!"],
      flag: ["That flag's crooked. Fix it.", "Checkpoint! Time for my nap!"],
      explode: ["That's what I call a firecracker!", "Bah, back in my day explosions were bigger."],
      gold: ["Pocket change! Don't mind if I do.", "My pension is saved!"],
      idle: ["Where did I put my teeth?", "Hey! Quit your standing around!", "Are we done yet? I need my pills."],
      level_start: ["Let's get this over with, I've got bingo at five.", "Alright, who's got my slippers?"],
      level_clear: ["Now that's how we did it in 1952!", "Done! Take me home."],
      level_fail: ["That's it. I'm retiring."]
    },
    goon: {
      spawn: ["HUH?!", "Get him!", "Is that a stick?!", "Intruder!", "Hey! You can't be here!", "Mommy?!", "Who ordered the stick guy?", "Sound the alarm! Wait, I am the alarm. AAAH!"],
      kill: ["My leg!", "Not the face!", "I just started this job!", "Tell my wife... I was a goon.", "That's not in my contract!", "Ow! My other leg!", "Gah! {Shit}!", "I want my mommy!", "Oh no, oh no, oh no!", "Bad day to be a bad guy."],
      hurt: ["Ow!", "Hey, watch it!", "That's my good arm!", "I'm too young for this!", "Medic! Oh wait, I'm the medic."],
      idle: ["Nice weather we're having.", "I hate this shift.", "Did you hear something? Nope.", "I miss my couch."],
      explode: ["Grenade!", "Take cover!", "Run away! Run away!", "That's gonna cost me my deposit!"]
    },
    announcer: {
      level_start: ["Level start! Let's go DOOSH!", "Ready? Set? DOOSH!", "It's showtime, stick fans!", "Round one. DOOSH!"],
      level_start_ice: ["Brrr-zerker Glacier! Bring a sweater!"],
      level_start_fire: ["Mount Ka-Blammo! Try not to melt!"],
      level_start_wind: ["Gustbuster Skyway! Hold on to your hats!"],
      level_start_water: ["Soggy Bottom Docks! Don't forget your floaties!"],
      level_start_mud: ["Sludge Bog! Mind the muck!"],
      level_start_jungle: ["Bananarama Temple! Watch for monkeys!"],
      level_start_mountain: ["Mount Doosh-more! Don't look down!"],
      level_start_plains: ["Cornfed Plains! Beware of the cows!"],
      level_start_fantasy: ["Castle Wizzlebeard! Mind the beard!"],
      level_start_moon: ["Moon Base Bonkers! One small step for stick!"],
      level_start_retro: ["Eight-Bit Bonanza! Press start!"],
      level_start_fortress: ["Doosh Fortress! The final showdown!"],
      level_clear: ["Level clear! DOOOOSH!", "Stage complete! You absolute legends!", "Outstanding! Doosh on!", "Another one bites the dust!"],
      level_fail: ["Game over, man. Game over.", "Better luck next time, sticks.", "Ouch. That's gonna leave a mark."],
      pickup_shotgun: ["SHOTGUN!", "DOOSH shotgun!"],
      pickup_mg: ["MACHINE GUN!", "BRRRT, machine gun!"],
      pickup_rocket: ["ROCKETS!", "Rocket launcher!"],
      pickup_flame: ["FLAMETHROWER!", "Flame on!"],
      pickup_laser: ["LASER!", "Pew pew, laser!"],
      pickup_spread: ["SPREAD GUN!", "Spread shot!"],
      pickup_dual: ["DUAL PISTOLS!"],
      pickup: ["Power up!", "New toy!"],
      pickup_barrier: ["BARRIER!"],
      pickup_rapid: ["RAPID FIRE!"],
      pickup_heal: ["HEALTH!"],
      pickup_1up: ["ONE UP!"],
      chopper: ["GET TO THE CHOPPA!", "Get to the choppa! Now!", "Chopper incoming! Move it!"],
      multikill: ["DOUBLE KILL!", "TRIPLE KILL!", "MULTI KILL!", "MONSTER DOOSH!"],
      boss_die: ["FATALITY! Doosh!", "KA-DOOOOSH! Boss down!"],
      weak: ["WEAK!", "That's his weakness!"],
      super_ice: ["Freeze Grenade acquired!"],
      super_fire: ["Napalm Strike acquired!"],
      super_wind: ["Tornado acquired!"],
      super_water: ["Tidal Wave acquired!"],
      super_mud: ["Mud Bomb acquired!"],
      super_jungle: ["Banana Boomerang acquired!"],
      super_mountain: ["Boulder acquired!"],
      super_plains: ["Cow Launcher acquired!"],
      super_fantasy: ["Magic Missiles acquired!"],
      super_moon: ["Gravity Bomb acquired!"],
      super_retro: ["Pixel Bomb acquired!"]
    },
    boss_ice: {
      boss_intro: ["Whoa. Chill out, little dude. Literally. I'm Frosty McChillface, and you're about to be a popsicle.", "Dude. You're on thin ice. And I brought a snowmobile."],
      boss_hurt: ["Brrr-ing it on!", "Dude, my fur!", "That's, like, not cool."],
      boss_enrage: ["Okay, now I'm ice-cold furious!", "My scarf! You got my tiny scarf!"],
      boss_die: ["Stay frosty... bro...", "Tell the avalanche... I'm out."]
    },
    boss_fire: {
      boss_intro: ["I'm Captain Combustion! I put out fires! And I'm on fire! This is fine!", "Hello! Don't mind the flames! I'm professionally on fire!"],
      boss_hurt: ["Ow, hot! I mean, ow!", "Hose! Where's the hose?!", "I'm fine! Everything's fine!"],
      boss_enrage: ["Now I'm REALLY on fire!", "Oh {hell}, I'm literally on fire!"],
      boss_die: ["Stop, drop, and roll... oh, I can't.", "Finally, a break from the heat."]
    },
    boss_wind: {
      boss_intro: ["Hear that? That's the sound of my mighty lungs! Gustav Blowhard will blow you away!", "Hooo! Time to clear the air!"],
      boss_hurt: ["Hey! I was mid-gust!", "Pffff! You knocked the wind out of me!", "Ooh, that tickled."],
      boss_enrage: ["Now I'm gonna huff, and puff, and blow your face off!", "Leaf blower, MAXIMUM!"],
      boss_die: ["I'm out of breath...", "Wind... down..."]
    },
    boss_water: {
      boss_intro: ["Arrr! Admiral Soggybottom be here! Me bathtub be mighty, and me bottom be soggy!", "Avast, ye landlubbers! Prepare to be rinsed!"],
      boss_hurt: ["Shiver me bubbles!", "Ye popped me rubber ducky!", "Arr, that smarts!"],
      boss_enrage: ["Now ye've made me tub angry!", "Pull the plug! No, don't pull the plug!"],
      boss_die: ["Down the drain I go... glug glug...", "Arrr... me bath... is cold..."]
    },
    boss_mud: {
      boss_intro: ["I say. Sir Sludgington, if you please. You've tracked mud on my carpet. Which is me.", "Good evening. Prepare to be squelched."],
      boss_hurt: ["Squelch! How rude!", "My monocle!", "Oh, I'm leaking."],
      boss_enrage: ["Now I'm positively filthy with rage!", "Mud in your eye, sir!"],
      boss_die: ["I'm dissolving... how undignified...", "Splorch."]
    },
    boss_jungle: {
      boss_intro: ["OOK OOK! CHIMPANZILLA SMASH TINY STICK!", "Ook! You come to my temple? Bad idea! Ook!"],
      boss_hurt: ["Ook!", "Hey! That my banana!", "AAAH! Ook ook!"],
      boss_enrage: ["NOW CHIMPANZILLA ANGRY! OOK OOK OOK!", "Me chest drum now! Bom bom bom!"],
      boss_die: ["Ook... no more... bananas...", "Ooook... tell the monkeys... I loved them..."]
    },
    boss_mountain: {
      boss_intro: ["Baaa! I'm Billy the Kidd, king of the mountain, and I'm the G.O.A.T.!", "Bleat this, stick boy! Baaa ha ha!"],
      boss_hurt: ["Baaa! Hey!", "Not the beard!", "Ow! My horns!"],
      boss_enrage: ["That's it! Jetpack, activate!", "I'm gonna ram you so hard!"],
      boss_die: ["Baaa... greatest... of all time...", "Goodbye... cruel... mountain..."]
    },
    boss_plains: {
      boss_intro: ["Howdy, varmint. Colonel Cornhusk. I'm gonna harvest ya like corn.", "This here's my field, and that there's my combine. Y'all are about to get thrashed."],
      boss_hurt: ["Dagnabbit!", "Ya crushed my corn!", "Ow! My straw!"],
      boss_enrage: ["Now I'm stuffed with rage! And straw!", "Crank up the combine!"],
      boss_die: ["I'm all shucked out...", "Tell the crows... I loved 'em..."]
    },
    boss_fantasy: {
      boss_intro: ["Behold! I am Wizzlebeard the Wise, and my beard is mightier than your gun!", "Fools! You dare enter my castle? Prepare to be turned into a toad!"],
      boss_hurt: ["My beard! Not the beard!", "Fie! That tingled!", "Egad!"],
      boss_enrage: ["Now you've done it! I shall conjure my TINY DRAGON!", "Abra-ca-DOOSH!"],
      boss_die: ["My beard... was my power... all along...", "{Damn}... {damn}... curses!"]
    },
    boss_moon: {
      boss_intro: ["Greetings, Earth stick. I am Emperor Zorp. Resistance is futile. Also, a little bit funny.", "Bow before Zorp, ruler of the Moon! Which is made of cheese. Probably."],
      boss_hurt: ["Bzzt! Ouch!", "Zorp does not appreciate this!", "My UFO! You dented my UFO!"],
      boss_enrage: ["Activate mech arms! All of them!", "Zorp is now maximum angry!"],
      boss_die: ["Zorp will return... in a better UFO...", "Take me to your leader... of the afterlife."]
    },
    boss_retro: {
      boss_intro: ["ERROR. PLAYER DETECTED. INITIATING GLITCH DOT EXE.", "PRESS START TO DIE."],
      boss_hurt: ["Bzzt! Segmentation fault!", "Syntax error!", "Lag spike!"],
      boss_enrage: ["FATAL ERROR. UPGRADING TO PHASE TWO.", "Overclocking! Zero one zero one!"],
      boss_die: ["Game over. Insert coin.", "Connection lost..."]
    },
    boss_fortress: {
      boss_intro: ["At last, we meet. I am General Doom-Doosh. Yes, I'm Sergeant Doosh's evil twin. My goatee is evil.", "Welcome to the DOOSHINATOR! Prepare for DOOM. And also DOOSH!"],
      boss_hurt: ["You dare scratch my goatee?!", "Impossible! Doosh versus Doosh!", "{Damn} you, Doosh!"],
      boss_enrage: ["Now I will unleash the full power of the DOOSHINATOR!", "Behold! The DOOOOSH of DOOM!"],
      boss_die: ["Impossible! I'm the better Doosh...", "Tell my goatee... I loved it..."]
    }
  };

  /* ------------------------------------------------------------------ helpers */
  const GRAWLIX = '@#$%&*';
  function hash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); }
  function grawlix(word) {
    const n = Math.max(4, Math.min(6, word.length)); let o = '';
    for (let i = 0; i < n; i++) o += GRAWLIX[i];
    return o;
  }
  // split "Eat {shit}, stick boy!" -> [{t:'Eat ',curse:false},{t:'shit',curse:true},{t:', stick boy!',curse:false}]
  function parse(text) {
    const out = []; const re = /\{([^}]+)\}/g; let last = 0; let m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push({ t: text.slice(last, m.index), curse: false });
      out.push({ t: m[1], curse: true }); last = re.lastIndex;
    }
    if (last < text.length) out.push({ t: text.slice(last), curse: false });
    return out;
  }
  function render(text, raw) {
    return parse(text).map((p) => (p.curse ? (raw ? p.t : grawlix(p.t)) : p.t)).join('');
  }
  function lineId(speaker, event, i) { return speaker + '/' + event + '_' + i; }

  const V = S.Voice = {
    LINES, THEMES, HEROES, parse, render, grawlix, hash, lineId,
    speakers: Object.keys(LINES),
    _last: {}, _spk: {}, _ev: {}, _busy: { main: 0, goon: 0 }, _busyPrio: { main: 0, goon: 0 }, _cur: null,
    _preQ: [], _preDone: {}, _preTimer: 0, _autoPre: true, _byText: null
  };

  // flat list for the TTS tool
  V.exportLines = function () {
    const out = [];
    for (const sp of Object.keys(LINES)) for (const ev of Object.keys(LINES[sp])) {
      LINES[sp][ev].forEach((text, i) => out.push({ id: lineId(sp, ev, i), speaker: sp, event: ev, i, text, h: hash(text) }));
    }
    return out;
  };
  V.count = function () { return V.exportLines().length; };

  /* ------------------------------------------------------------------ settings */
  function aset() {
    const sv = S.Save; const st = sv && (sv.settings || (sv.data && sv.data.settings));
    return (st && st.audio) || {};
  }
  function chatter() {
    const c = String(aset().chatter || 'some').toLowerCase();
    if (c === 'off' || c === 'none') return 0;
    if (c === 'lots' || c === 'constant' || c === 'more') return 2;
    return 1;
  }
  function rawMode() { const c = String(aset().cursing || 'bleep').toLowerCase(); return c === 'raw' || c === 'uncensored' || c === 'on'; }
  function bubblesOn() { return aset().bubbles !== false; }
  const clock = () => Date.now() / 1000;

  /* event table: p=priority 1 ambient/2 reactive/3 story, pr=[some,lots] probability, cd=[some,lots] per speaker+event cooldown */
  const EV = {
    spawn: { p: 2, pr: [1, 1], cd: [4, 2] },
    kill: { p: 1, pr: [0.12, 0.5], cd: [7, 2.5] },
    multikill: { p: 2, pr: [0.85, 1], cd: [5, 3] },
    pickup: { p: 2, pr: [0.55, 1], cd: [6, 2] },
    hurt: { p: 2, pr: [0.3, 0.75], cd: [4, 1.5] },
    low_hp: { p: 2, pr: [0.8, 1], cd: [12, 6] },
    die: { p: 3, pr: [1, 1], cd: [0, 0] },
    rescue: { p: 2, pr: [1, 1], cd: [2, 1] },
    flag: { p: 2, pr: [0.7, 1], cd: [5, 3] },
    explode: { p: 1, pr: [0.12, 0.5], cd: [9, 3] },
    gold: { p: 1, pr: [0.06, 0.3], cd: [14, 5] },
    idle: { p: 1, pr: [0.6, 1], cd: [18, 9] },
    weak: { p: 2, pr: [0.6, 1], cd: [4, 2] },
    chopper: { p: 3, pr: [1, 1], cd: [0, 0] },
    super: { p: 3, pr: [1, 1], cd: [0, 0] },
    boss_intro: { p: 3, pr: [1, 1], cd: [0, 0] },
    boss_hurt: { p: 2, pr: [0.45, 0.9], cd: [6, 3] },
    boss_enrage: { p: 3, pr: [1, 1], cd: [0, 0] },
    boss_die: { p: 3, pr: [1, 1], cd: [0, 0] },
    level_start: { p: 3, pr: [1, 1], cd: [0, 0] },
    level_clear: { p: 3, pr: [1, 1], cd: [0, 0] },
    level_fail: { p: 3, pr: [1, 1], cd: [0, 0] }
  };
  const SPK_CD = { hero: [3, 1.2], goon: [2.2, 0.8], boss: [1.5, 0.8], announcer: [1.2, 0.5] };
  function spkClass(sp) { return sp === 'goon' ? 'goon' : sp === 'announcer' ? 'announcer' : sp.indexOf('boss_') === 0 ? 'boss' : 'hero'; }
  function evKey(ev) {
    if (ev.indexOf('pickup') === 0) return 'pickup';
    if (ev.indexOf('super_') === 0) return 'super';
    if (ev.indexOf('level_start') === 0) return 'level_start';
    return ev;
  }

  function normSpeaker(sp, o) {
    if (LINES[sp]) return sp;
    if (sp === 'enemy' || sp === 'grunt') return 'goon';
    if (sp === 'boss') {
      const th = (o && o.theme) || (S.Game && S.Game.theme && S.Game.theme.id) || (S.Game && S.Game.level && S.Game.level.theme);
      const id = 'boss_' + (typeof th === 'object' && th ? th.id : th);
      if (LINES[id]) return id;
    }
    return null;
  }
  // pick the list of lines for (speaker,event) with fallbacks; returns {event, list} or null
  function listFor(sp, ev, o) {
    const L = LINES[sp];
    if (ev === 'level_start' && o && o.theme && L['level_start_' + o.theme]) return { event: 'level_start_' + o.theme, list: L['level_start_' + o.theme] };
    if (L[ev]) return { event: ev, list: L[ev] };
    if (ev.indexOf('pickup_') === 0 && L.pickup) return { event: 'pickup', list: L.pickup };
    return null;
  }

  /* ------------------------------------------------------------------ audio */
  function manifest(id) { const v = S.AUDIO_FILES && S.AUDIO_FILES.vo; return (v && v[id]) || null; }
  function fileFor(id, text) {
    const m = manifest(id);
    if (!m || !m.src) return null;
    if (m.h && m.h !== hash(text)) return null; // catalogue text changed since the mp3 was built
    return m;
  }
  function stopCur() {
    const c = V._cur; V._cur = null;
    if (!c) return;
    const A = S.Audio; if (!A || !A.ctx) return;
    try {
      const t = A.ctx.currentTime;
      c.h.out.gain.cancelScheduledValues(t); c.h.out.gain.setTargetAtTime(0, t, 0.02); c.h.src.stop(t + 0.1);
      (c.beeps || []).forEach((b) => A.cancelBeep(b));
    } catch (e) { /* ignore */ }
  }
  function playFile(m, id, prio, pan, vol, waitSec) {
    const A = S.Audio;
    if (!A || !A.inited || !m) return;
    const t0 = clock();
    const go = (buf) => {
      if (!buf || !A.ready() || clock() - t0 > waitSec) return;
      const h = A.playBuffer(buf, { bus: 'voice', vol, pan });
      if (!h) return;
      const cur = { h, id, prio, beeps: [] };
      const curses = m.curses || [];
      if (curses.length && !rawMode()) {
        const g = h.out.gain;
        curses.forEach((r) => {
          const s = Math.max(0, r[0]); const e = Math.max(s + 0.08, r[1]);
          g.setValueAtTime(vol, h.t + Math.max(0, s - 0.015)); g.linearRampToValueAtTime(0, h.t + s);
          g.setValueAtTime(0, h.t + e); g.linearRampToValueAtTime(vol, h.t + e + 0.015);
          cur.beeps.push(A.beep(e - s, { when: h.t + s, bus: 'voice', vol: 0.3 }));
        });
      }
      V._cur = cur;
      h.src.onended = () => { if (V._cur === cur) V._cur = null; };
      if (S.Music && S.Music.duck) S.Music.duck(prio >= 3 ? 0.5 : 0.3, buf.duration + 0.25);
    };
    const buf = A.cached(m.src);
    if (buf) go(buf); else A.loadUrl(m.src).then(go);
  }

  /* ------------------------------------------------------------------ bubbles */
  function anchor(sp, o) {
    if (o.x != null && o.y != null) return { x: o.x, y: o.y, follow: o.follow };
    const f = o.follow;
    if (f && f.x != null) return { x: f.x, y: f.y - (f.h || 36) - 12, follow: f };
    const G = S.Game;
    if (spkClass(sp) === 'hero' && G && G.player) return { x: G.player.x, y: G.player.y - (G.player.h || 36) - 12, follow: G.player };
    if (spkClass(sp) === 'boss' && G && G.ents) {
      for (let i = 0; i < G.ents.length; i++) if (G.ents[i].kind === 'boss' && !G.ents[i].dead) { const b = G.ents[i]; return { x: b.x, y: b.y - (b.h || 60) - 14, follow: b }; }
    }
    if (G && G.cam) return { x: G.cam.x + G.cam.w / 2, y: G.cam.y + 70, follow: null, screen: true };
    return { x: 0, y: 0, follow: null };
  }
  function bubble(sp, text, est, o) {
    if (!bubblesOn()) return;
    const C = S.Comic;
    if (!C || typeof C.bubble !== 'function') return;
    const a = anchor(sp, o);
    try { C.bubble(render(text, rawMode()), a.x, a.y, { follow: a.follow, life: Math.max(1.5, est + 0.8), speaker: sp }); } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------------------ say */
  // say(speaker,event,{x,y,follow,force,theme,pick,chance}) -> {id,text,speaker,event} | null
  V.say = function (speaker, event, o) {
    o = o || {};
    const sp = normSpeaker(speaker, o);
    if (!sp || !event) return null;
    const ent = listFor(sp, event, o);
    if (!ent || !ent.list.length) return null;
    const key = evKey(event); const cfg = EV[key] || { p: 1, pr: [0.3, 0.8], cd: [6, 3] };
    const lvl = chatter(); const now = clock(); const cls = spkClass(sp);
    const chan = cls === 'goon' ? 'goon' : 'main';
    if (!o.force) {
      if (lvl === 0 && cfg.p < 3) return null;
      const li = lvl === 2 ? 1 : 0;
      const pr = o.chance != null ? o.chance : cfg.pr[li];
      if (pr < 1 && Math.random() > pr) return null;
      if (now < (V._ev[sp + '|' + key] || 0)) return null;
      if (now < (V._spk[sp] || 0)) return null;
      if (now < V._busy[chan] && cfg.p <= V._busyPrio[chan]) return null;
      if (chan === 'goon' && now < V._busy.main && V._busyPrio.main >= 3) return null;
    }
    // choose a line (never the same one twice in a row)
    const lk = sp + '|' + ent.event; const n = ent.list.length;
    let i = o.pick != null ? o.pick % n : Math.floor(Math.random() * n);
    if (o.pick == null && n > 1 && i === V._last[lk]) i = (i + 1 + Math.floor(Math.random() * (n - 1))) % n;
    V._last[lk] = i;
    const text = ent.list[i]; const id = lineId(sp, ent.event, i);
    const m = fileFor(id, text);
    const est = (m && m.d) || (text.length * 0.062 + 0.5);
    const li = lvl === 2 ? 1 : 0;
    V._ev[sp + '|' + key] = now + cfg.cd[li];
    V._spk[sp] = now + (SPK_CD[cls] || [3, 1])[li] + est * 0.5;
    if (cfg.p >= V._busyPrio[chan] || now >= V._busy[chan]) { V._busy[chan] = now + est * 0.92; V._busyPrio[chan] = cfg.p; }
    if (cfg.p >= 3 && chan === 'main') stopCur();
    bubble(sp, text, est, o);
    if (m) {
      const cp = cls === 'goon' && S.Audio && S.Audio.camPan ? S.Audio.camPan(o.x != null ? o.x : (o.follow && o.follow.x)) : { pan: 0, att: 1 };
      playFile(m, id, cfg.p, cp.pan, (o.vol == null ? 1 : o.vol) * (cls === 'goon' ? 0.8 * cp.att : 1), cfg.p >= 3 ? 1.6 : 0.7);
    }
    return { id, text, speaker: sp, event: ent.event, hasAudio: !!m };
  };

  // line(speaker,text,{x,y,follow}): show/speak an arbitrary line. Uses the mp3 when the text is in the catalogue.
  V.line = function (speaker, text, o) {
    o = o || {};
    if (!V._byText) {
      V._byText = {};
      V.exportLines().forEach((l) => { if (!V._byText[l.speaker + '|' + l.text]) V._byText[l.speaker + '|' + l.text] = l; });
    }
    const hit = V._byText[speaker + '|' + text];
    const m = hit ? fileFor(hit.id, text) : null;
    const est = (m && m.d) || (text.length * 0.062 + 0.5);
    bubble(speaker, text, est, o);
    if (m) playFile(m, hit.id, 2, 0, o.vol == null ? 1 : o.vol, 0.7);
    return { id: hit ? hit.id : null, text, speaker, hasAudio: !!m };
  };

  /* ------------------------------------------------------------------ preload + update */
  // queue every mp3 of the given speakers (or all) for background fetch+decode, 1 per ~120 ms
  V.preload = function (speakers) {
    const list = speakers && speakers.length ? speakers : V.speakers;
    list.forEach((sp) => {
      if (!LINES[sp]) return;
      for (const ev of Object.keys(LINES[sp])) LINES[sp][ev].forEach((text, i) => {
        const id = lineId(sp, ev, i);
        if (!V._preDone[id] && fileFor(id, text)) { V._preDone[id] = 1; V._preQ.push(id); }
      });
    });
  };
  V.update = function (dt) {
    const A = S.Audio;
    if (!A || !A.ready()) return;
    if (V._autoPre) { V._autoPre = false; V.preload(['announcer', 'goon']); }
    // optimisation: only the dude currently being played is preloaded (others load when they swap in)
    const pid = S.Game && S.Game.player && S.Game.player.id;
    if (pid && pid !== V._lastDude && LINES[pid]) { V._lastDude = pid; V.preload([pid]); }
    if (!V._preQ.length) return;
    V._preAcc = (V._preAcc || 0) + (dt || 0.016);
    if (V._preAcc < 0.12) return;
    V._preAcc = 0;
    const id = V._preQ.shift(); const m = manifest(id);
    if (m && m.src) A.loadUrl(m.src);
  };
  V.stop = function () { stopCur(); V._busy.main = V._busy.goon = 0; V._busyPrio.main = V._busyPrio.goon = 0; };
})();
