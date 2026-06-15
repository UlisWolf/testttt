import type { ScootRoute, RouteTypeConfig } from '../types'

export const ROUTE_TYPE_CONFIGS: Record<string, RouteTypeConfig> = {
  nuit: {
    id: 'nuit',
    name: 'Nuit',
    emoji: '🌙',
    description: 'Rues bien éclairées, boulevards lumineux pour rouler en sécurité la nuit',
    scoreLabel: 'Luminosité',
    gradient: 'from-indigo-900 via-purple-900 to-slate-900',
    bgColor: 'bg-indigo-950',
    textColor: 'text-indigo-300',
    borderColor: 'border-indigo-700',
    badgeColor: 'bg-indigo-800 text-indigo-200',
  },
  securite: {
    id: 'securite',
    name: 'Sécurité',
    emoji: '🛡️',
    description: 'Zones fréquentées, passages animés pour ne jamais être seul',
    scoreLabel: 'Fréquentation',
    gradient: 'from-orange-600 via-red-600 to-rose-700',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-300',
    badgeColor: 'bg-orange-100 text-orange-700',
  },
  chill: {
    id: 'chill',
    name: 'Chill',
    emoji: '🌿',
    description: 'Parcs, voies vertes et ruelles calmes pour une balade zen',
    scoreLabel: 'Tranquillité',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-300',
    badgeColor: 'bg-emerald-100 text-emerald-700',
  },
  panoramique: {
    id: 'panoramique',
    name: 'Panoramique',
    emoji: '🏛️',
    description: 'Monuments, jardins et curiosités pour s\'émerveiller en roulant',
    scoreLabel: 'Points d\'intérêt',
    gradient: 'from-amber-500 via-yellow-500 to-lime-500',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-300',
    badgeColor: 'bg-amber-100 text-amber-700',
  },
}

export const ALL_ROUTES: ScootRoute[] = [
  // ── NUIT ─────────────────────────────────────────────────────────────────
  {
    id: 'nuit-1',
    name: 'Boulevard des Lumières',
    description: 'Un grand classique nocturne : les Champs-Élysées jusqu\'à l\'Opéra, tout en lumières et en animation même après minuit.',
    type: 'nuit',
    distance: 5.2,
    duration: 22,
    difficulty: 'Facile',
    score: 96,
    scoreLabel: 'Luminosité',
    color: '#818cf8',
    tags: ['Éclairé', 'Large voie', 'Animé', 'Plat'],
    waypoints: [
      [48.8738, 2.2950], // Place de l'Étoile
      [48.8722, 2.3031],
      [48.8706, 2.3144],
      [48.8698, 2.3280], // Franklin D. Roosevelt
      [48.8698, 2.3327],
      [48.8705, 2.3408], // Rond-Point des Champs-Élysées
      [48.8710, 2.3487],
      [48.8726, 2.3560], // Place de la Concorde
      [48.8740, 2.3620],
      [48.8750, 2.3680],
      [48.8762, 2.3730], // Tuileries
      [48.8762, 2.3780],
      [48.8766, 2.3835],
      [48.8772, 2.3491], // Palais Royal direction
      [48.8749, 2.3330], // Opéra Garnier
    ],
    pois: [
      { name: 'Arc de Triomphe', lat: 48.8738, lng: 2.2950, icon: '🏛️', description: 'Monument illuminé toute la nuit' },
      { name: 'Grand Palais', lat: 48.8661, lng: 2.3125, icon: '✨', description: 'Illuminations spectaculaires' },
      { name: 'Place de la Concorde', lat: 48.8656, lng: 2.3212, icon: '💡', description: 'Obélisque et fontaines lumineuses' },
      { name: 'Opéra Garnier', lat: 48.8719, lng: 2.3316, icon: '🎭', description: 'Façade dorée illuminée jusqu\'à minuit' },
    ],
    elevationGain: 12,
  },
  {
    id: 'nuit-2',
    name: 'La Seine de Nuit',
    description: 'Longer la Seine de nuit, c\'est voir Paris dans toute sa splendeur. Les quais sont parfaitement éclairés et offrent une vue unique sur les ponts illuminés.',
    type: 'nuit',
    distance: 7.8,
    duration: 34,
    difficulty: 'Facile',
    score: 91,
    scoreLabel: 'Luminosité',
    color: '#6366f1',
    tags: ['Quais éclairés', 'Vue sur la Seine', 'Romantique', 'Piste cyclable'],
    waypoints: [
      [48.8566, 2.3522], // Notre-Dame
      [48.8573, 2.3475],
      [48.8583, 2.3415],
      [48.8598, 2.3356], // Pont Neuf
      [48.8605, 2.3320],
      [48.8619, 2.3270],
      [48.8634, 2.3220],
      [48.8645, 2.3130], // Musée d'Orsay
      [48.8659, 2.3060],
      [48.8661, 2.2990],
      [48.8674, 2.2930], // Pont de l'Alma
      [48.8586, 2.2945], // Tour Eiffel
    ],
    pois: [
      { name: 'Notre-Dame illuminée', lat: 48.8530, lng: 2.3499, icon: '🌙', description: 'Cathédrale en pleine restauration, éclairée sobrement' },
      { name: 'Pont Neuf', lat: 48.8566, lng: 2.3413, icon: '🌉', description: 'Plus vieux pont de Paris, magnifique de nuit' },
      { name: 'Musée d\'Orsay', lat: 48.8600, lng: 2.3266, icon: '💛', description: 'Façade Art Nouveau lumineuse' },
      { name: 'Tour Eiffel', lat: 48.8584, lng: 2.2945, icon: '✨', description: 'Show de lumières toutes les heures' },
    ],
    elevationGain: 8,
  },
  {
    id: 'nuit-3',
    name: 'Pigalle — Montmartre Express',
    description: 'Des néons de Pigalle aux lumières du Sacré-Cœur, une montée nocturne vivante et bien éclairée dans le Paris festif.',
    type: 'nuit',
    distance: 3.4,
    duration: 18,
    difficulty: 'Moyen',
    score: 84,
    scoreLabel: 'Luminosité',
    color: '#a78bfa',
    tags: ['Néons', 'Festif', 'Montée douce', 'Animé tard'],
    waypoints: [
      [48.8832, 2.3364], // Pigalle
      [48.8840, 2.3360],
      [48.8845, 2.3370],
      [48.8858, 2.3375],
      [48.8870, 2.3384],
      [48.8877, 2.3395],
      [48.8866, 2.3420], // Abbesses
      [48.8851, 2.3431],
      [48.8867, 2.3432], // Sacré-Cœur
    ],
    pois: [
      { name: 'Place Pigalle', lat: 48.8832, lng: 2.3364, icon: '🎪', description: 'Cœur animé du quartier, ouvert toute la nuit' },
      { name: 'Moulin Rouge', lat: 48.8841, lng: 2.3322, icon: '🎠', description: 'Célèbre cabaret aux lumières rouges' },
      { name: 'Place des Abbesses', lat: 48.8844, lng: 2.3384, icon: '🌟', description: 'Belle place éclairée, terrasses animées' },
      { name: 'Sacré-Cœur', lat: 48.8867, lng: 2.3431, icon: '⛪', description: 'Basilique illuminée, panorama nocturne' },
    ],
    elevationGain: 85,
  },
  {
    id: 'nuit-4',
    name: 'Nuit Rive Gauche',
    description: 'Saint-Germain, le Quartier Latin et le Luxembourg — le Paris intellectuel de nuit, sous des lampadaires Art Déco.',
    type: 'nuit',
    distance: 4.5,
    duration: 20,
    difficulty: 'Facile',
    score: 88,
    scoreLabel: 'Luminosité',
    color: '#7c3aed',
    tags: ['Saint-Germain', 'Cafés de nuit', 'Littéraire', 'Bien éclairé'],
    waypoints: [
      [48.8534, 2.3488], // Saint-Michel
      [48.8527, 2.3460],
      [48.8515, 2.3427], // Odéon
      [48.8510, 2.3380],
      [48.8528, 2.3330], // Saint-Germain-des-Prés
      [48.8545, 2.3298],
      [48.8495, 2.3360], // Jardin du Luxembourg
      [48.8480, 2.3400],
      [48.8468, 2.3440], // Port Royal
    ],
    pois: [
      { name: 'Place Saint-Michel', lat: 48.8534, lng: 2.3488, icon: '🦁', description: 'Fontaine illuminée, point de rassemblement nocturne' },
      { name: 'Café de Flore', lat: 48.8540, lng: 2.3327, icon: '☕', description: 'Café mythique ouvert jusqu\'à 2h du matin' },
      { name: 'Jardin du Luxembourg', lat: 48.8462, lng: 2.3371, icon: '🌙', description: 'Grilles illuminées, ambiance feutrée' },
    ],
    elevationGain: 20,
  },

  // ── SÉCURITÉ ──────────────────────────────────────────────────────────────
  {
    id: 'securite-1',
    name: 'Boulevard Haussmann en Sécurité',
    description: 'Les grands boulevards animés en permanence, avec commerces, touristes et police. Idéal pour rouler serein à toute heure.',
    type: 'securite',
    distance: 6.1,
    duration: 26,
    difficulty: 'Facile',
    score: 94,
    scoreLabel: 'Fréquentation',
    color: '#f97316',
    tags: ['Très fréquenté', 'Commerces ouverts', 'Boulevard large', 'Caméras'],
    waypoints: [
      [48.8759, 2.3310], // Opéra
      [48.8753, 2.3380],
      [48.8747, 2.3440],
      [48.8741, 2.3491], // Richelieu-Drouot
      [48.8735, 2.3545],
      [48.8724, 2.3600], // Grands Boulevards
      [48.8716, 2.3638],
      [48.8706, 2.3660], // Bonne Nouvelle
      [48.8692, 2.3668],
      [48.8680, 2.3653], // Strasbourg-Saint-Denis
      [48.8668, 2.3618], // République
    ],
    pois: [
      { name: 'Opéra Garnier', lat: 48.8719, lng: 2.3316, icon: '🎭', description: 'Quartier très fréquenté, touristes permanents' },
      { name: 'Galeries Lafayette', lat: 48.8740, lng: 2.3327, icon: '🏬', description: 'Lieu de grande affluence, très sécurisé' },
      { name: 'Place de la République', lat: 48.8673, lng: 2.3629, icon: '🏛️', description: 'Grande place animée jour et nuit' },
    ],
    elevationGain: 15,
  },
  {
    id: 'securite-2',
    name: 'Marais Vivant',
    description: 'Le Marais est l\'un des quartiers les plus animés de Paris 24h/24. Cafés, boutiques, rue de Rivoli — toujours du monde autour.',
    type: 'securite',
    distance: 4.2,
    duration: 20,
    difficulty: 'Facile',
    score: 97,
    scoreLabel: 'Fréquentation',
    color: '#ea580c',
    tags: ['Toujours animé', 'Touristes', 'Commerces', 'Sécurisé'],
    waypoints: [
      [48.8603, 2.3476], // Hôtel de Ville
      [48.8592, 2.3502],
      [48.8591, 2.3556], // Bastille direction
      [48.8590, 2.3604],
      [48.8597, 2.3634], // Place des Vosges
      [48.8604, 2.3655],
      [48.8618, 2.3612],
      [48.8624, 2.3560], // Centre Pompidou
      [48.8606, 2.3522],
    ],
    pois: [
      { name: 'Hôtel de Ville', lat: 48.8566, lng: 2.3522, icon: '🏛️', description: 'Place très surveillée et fréquentée' },
      { name: 'Place des Vosges', lat: 48.8555, lng: 2.3645, icon: '🌹', description: 'Quartier animé, galeries et cafés' },
      { name: 'Centre Pompidou', lat: 48.8607, lng: 2.3527, icon: '🎨', description: 'Piazza toujours bondée de gens' },
    ],
    elevationGain: 10,
  },
  {
    id: 'securite-3',
    name: 'Châtelet — Les Halles Hub',
    description: 'Le plus grand hub de transport d\'Europe. Des milliers de personnes à toute heure, sécurité omniprésente.',
    type: 'securite',
    distance: 3.8,
    duration: 17,
    difficulty: 'Facile',
    score: 99,
    scoreLabel: 'Fréquentation',
    color: '#dc2626',
    tags: ['Ultra-fréquenté', 'Transport', 'Vidéosurveillance', 'Ouvert 24h'],
    waypoints: [
      [48.8613, 2.3469], // Châtelet
      [48.8617, 2.3450],
      [48.8624, 2.3436], // Les Halles
      [48.8635, 2.3453],
      [48.8646, 2.3484],
      [48.8651, 2.3524],
      [48.8642, 2.3560],
      [48.8627, 2.3576], // Arts et Métiers
    ],
    pois: [
      { name: 'Châtelet', lat: 48.8584, lng: 2.3470, icon: '🚇', description: 'Nœud de transport, toujours plein de monde' },
      { name: 'Forum des Halles', lat: 48.8619, lng: 2.3437, icon: '🏢', description: 'Centre commercial, très fréquenté' },
    ],
    elevationGain: 5,
  },
  {
    id: 'securite-4',
    name: 'Saint-Lazare — Opéra',
    description: 'Entre la gare Saint-Lazare et l\'Opéra, un axe commercial ultra-fréquenté où vous n\'êtes jamais seul.',
    type: 'securite',
    distance: 5.0,
    duration: 22,
    difficulty: 'Facile',
    score: 92,
    scoreLabel: 'Fréquentation',
    color: '#b45309',
    tags: ['Gare', 'Commerces', 'Foule', 'Axes principaux'],
    waypoints: [
      [48.8760, 2.3245], // Gare Saint-Lazare
      [48.8765, 2.3275],
      [48.8758, 2.3306],
      [48.8748, 2.3325], // Trinité
      [48.8740, 2.3312],
      [48.8730, 2.3305],
      [48.8719, 2.3316], // Opéra
    ],
    pois: [
      { name: 'Gare Saint-Lazare', lat: 48.8762, lng: 2.3249, icon: '🚂', description: 'Plus grande gare d\'Europe, ultra-sécurisée' },
      { name: 'Printemps Haussmann', lat: 48.8752, lng: 2.3287, icon: '🛍️', description: 'Grand magasin très fréquenté' },
      { name: 'Opéra Garnier', lat: 48.8719, lng: 2.3316, icon: '🎭', description: 'Centre touristique animé' },
    ],
    elevationGain: 18,
  },

  // ── CHILL ─────────────────────────────────────────────────────────────────
  {
    id: 'chill-1',
    name: 'Coulée Verte du 12ème',
    description: 'L\'ancienne voie ferrée transformée en promenade verdoyante suspendue. Calme absolu, nature en ville, zéro voiture.',
    type: 'chill',
    distance: 4.7,
    duration: 22,
    difficulty: 'Facile',
    score: 98,
    scoreLabel: 'Tranquillité',
    color: '#16a34a',
    tags: ['Voie verte', 'Sans voiture', 'Nature', 'Suspendu'],
    waypoints: [
      [48.8530, 2.3706], // Bastille
      [48.8495, 2.3740],
      [48.8477, 2.3770],
      [48.8460, 2.3810],
      [48.8445, 2.3860],
      [48.8430, 2.3905],
      [48.8415, 2.3944], // Gare de Lyon direction
      [48.8400, 2.3975],
      [48.8382, 2.4010], // Nation direction
    ],
    pois: [
      { name: 'Viaduc des Arts', lat: 48.8513, lng: 2.3717, icon: '🌿', description: 'Promenade plantée au-dessus des galeries d\'art' },
      { name: 'Jardins suspendus', lat: 48.8460, lng: 2.3810, icon: '🌸', description: 'Roses et plantes aromatiques à l\'abandon chic' },
      { name: 'Bois de Vincennes', lat: 48.8355, lng: 2.4214, icon: '🌳', description: 'Grand poumon vert de l\'Est parisien' },
    ],
    elevationGain: 4,
  },
  {
    id: 'chill-2',
    name: 'Canal Saint-Martin',
    description: 'Les bords du canal Saint-Martin, avec ses écluses, ses ponts en fonte et ses terrasses branchées. La balade chill par excellence.',
    type: 'chill',
    distance: 5.5,
    duration: 25,
    difficulty: 'Facile',
    score: 95,
    scoreLabel: 'Tranquillité',
    color: '#059669',
    tags: ['Canal', 'Vélo-friendly', 'Bobo', 'Ombragé'],
    waypoints: [
      [48.8673, 2.3629], // République
      [48.8690, 2.3640],
      [48.8710, 2.3651],
      [48.8728, 2.3665], // Écluse
      [48.8748, 2.3672],
      [48.8769, 2.3659], // Goncourt
      [48.8787, 2.3647],
      [48.8803, 2.3634], // Jaurès
      [48.8817, 2.3615],
      [48.8828, 2.3592], // La Villette
    ],
    pois: [
      { name: 'Écluses du canal', lat: 48.8728, lng: 2.3665, icon: '🚤', description: 'Spectacle des péniches en mouvement' },
      { name: 'Hôpital Saint-Louis', lat: 48.8761, lng: 2.3665, icon: '🏛️', description: 'Architecture classique dans un écrin de calme' },
      { name: 'Parc de la Villette', lat: 48.8938, lng: 2.3944, icon: '🌳', description: 'Immense parc urbain, chill total' },
    ],
    elevationGain: 6,
  },
  {
    id: 'chill-3',
    name: 'Bois de Boulogne Zen',
    description: 'Des allées forestières à l\'écart de la ville. Lacs, sentiers ombragés, hippodrome endormi — le dépaysement à 15 min du centre.',
    type: 'chill',
    distance: 8.2,
    duration: 38,
    difficulty: 'Facile',
    score: 93,
    scoreLabel: 'Tranquillité',
    color: '#15803d',
    tags: ['Forêt', 'Lacs', 'Oxygène', 'Grand espace'],
    waypoints: [
      [48.8602, 2.2487], // Porte Maillot
      [48.8619, 2.2430],
      [48.8644, 2.2380],
      [48.8670, 2.2325], // Lac Supérieur
      [48.8680, 2.2280],
      [48.8663, 2.2223],
      [48.8640, 2.2180],
      [48.8603, 2.2162], // Lac Inférieur
      [48.8565, 2.2180],
      [48.8538, 2.2210],
      [48.8520, 2.2270], // Hippodrome
      [48.8510, 2.2340],
    ],
    pois: [
      { name: 'Lac Supérieur', lat: 48.8683, lng: 2.2295, icon: '🦢', description: 'Cygnes, barques et silence total' },
      { name: 'Jardins de Bagatelle', lat: 48.8639, lng: 2.2195, icon: '🌹', description: 'Roseraie emblématique, milliers de variétés' },
      { name: 'Hippodrome de Longchamp', lat: 48.8510, lng: 2.2310, icon: '🐴', description: 'Magnifique pelouse au calme' },
    ],
    elevationGain: 22,
  },
  {
    id: 'chill-4',
    name: 'Berges de la Seine Rive Gauche',
    description: 'Les berges réaménagées en promenade piétonne et cyclable. Hamacs, jeux, jardins flottants — la détente totale au fil de l\'eau.',
    type: 'chill',
    distance: 3.9,
    duration: 18,
    difficulty: 'Facile',
    score: 91,
    scoreLabel: 'Tranquillité',
    color: '#0d9488',
    tags: ['Berges', 'Sans voiture', 'Hamacs', 'Vue fleuve'],
    waypoints: [
      [48.8584, 2.2945], // Tour Eiffel
      [48.8589, 2.3000],
      [48.8594, 2.3055],
      [48.8601, 2.3112],
      [48.8608, 2.3167],
      [48.8613, 2.3222], // Pont de l'Alma
      [48.8619, 2.3276],
      [48.8622, 2.3328],
      [48.8627, 2.3380], // Musée d'Orsay
    ],
    pois: [
      { name: 'Jardins flottants', lat: 48.8594, lng: 2.3055, icon: '🌺', description: 'Péniches-jardins avec fleurs et végétation' },
      { name: 'Zone hamacs', lat: 48.8608, lng: 2.3167, icon: '😴', description: 'Installation de détente sur les berges' },
      { name: 'Passerelle Debilly', lat: 48.8614, lng: 2.3043, icon: '🌉', description: 'Pont piéton avec vue sur la Tour Eiffel' },
    ],
    elevationGain: 3,
  },

  // ── PANORAMIQUE ───────────────────────────────────────────────────────────
  {
    id: 'panoramique-1',
    name: 'Paris Classique — Les Incontournables',
    description: 'Le grand tour des monuments emblématiques : Tour Eiffel, Louvre, Notre-Dame. Une immersion totale dans le patrimoine parisien.',
    type: 'panoramique',
    distance: 9.3,
    duration: 45,
    difficulty: 'Moyen',
    score: 100,
    scoreLabel: 'Points d\'intérêt',
    color: '#d97706',
    tags: ['UNESCO', 'Monuments', 'Tourisme', 'Incontournable'],
    waypoints: [
      [48.8584, 2.2945], // Tour Eiffel
      [48.8612, 2.3014],
      [48.8627, 2.3072],
      [48.8630, 2.3186], // Musée d'Orsay
      [48.8637, 2.3236],
      [48.8648, 2.3286],
      [48.8654, 2.3330], // Tuileries
      [48.8659, 2.3380],
      [48.8657, 2.3430],
      [48.8637, 2.3445], // Louvre
      [48.8596, 2.3471],
      [48.8561, 2.3485], // Île de la Cité
      [48.8530, 2.3499], // Notre-Dame
    ],
    pois: [
      { name: 'Tour Eiffel', lat: 48.8584, lng: 2.2945, icon: '🗼', description: 'La Dame de Fer, symbole de Paris' },
      { name: 'Musée d\'Orsay', lat: 48.8600, lng: 2.3266, icon: '🎨', description: 'Chef-d\'œuvre de l\'architecture Art Nouveau' },
      { name: 'Jardin des Tuileries', lat: 48.8636, lng: 2.3278, icon: '🌷', description: 'Fleurs, statues et fontaines royales' },
      { name: 'Musée du Louvre', lat: 48.8606, lng: 2.3376, icon: '🏛️', description: 'Plus grand musée du monde, pyramide de verre' },
      { name: 'Notre-Dame de Paris', lat: 48.8530, lng: 2.3499, icon: '⛪', description: 'Cathédrale gothique en cours de renaissance' },
    ],
    elevationGain: 25,
  },
  {
    id: 'panoramique-2',
    name: 'Jardins & Fleurs de Paris',
    description: 'Une route dédiée aux plus beaux jardins parisiens : rosiers, pivoines, lavandes. Le Paris botanique que les touristes ne connaissent pas.',
    type: 'panoramique',
    distance: 6.8,
    duration: 32,
    difficulty: 'Facile',
    score: 95,
    scoreLabel: 'Points d\'intérêt',
    color: '#84cc16',
    tags: ['Jardins', 'Fleurs', 'Botanique', 'Photographique'],
    waypoints: [
      [48.8462, 2.3371], // Jardin du Luxembourg
      [48.8480, 2.3406],
      [48.8495, 2.3440],
      [48.8516, 2.3478],
      [48.8540, 2.3495], // Palais Royal gardens
      [48.8558, 2.3500],
      [48.8568, 2.3490],
      [48.8576, 2.3470],
      [48.8580, 2.3450],
      [48.8580, 2.3320], // Tuileries
      [48.8636, 2.3278], // Champs direction
    ],
    pois: [
      { name: 'Jardin du Luxembourg', lat: 48.8462, lng: 2.3371, icon: '🌸', description: 'Parterre de fleurs, fontaine Médicis, massifs royaux' },
      { name: 'Jardin du Palais Royal', lat: 48.8638, lng: 2.3373, icon: '🌺', description: 'Colonnes de Buren et rosiers grimpants' },
      { name: 'Jardin des Tuileries', lat: 48.8636, lng: 2.3278, icon: '🌷', description: 'Allées de tilleuls, lavandes et fontaines' },
      { name: 'Square du Vert-Galant', lat: 48.8566, lng: 2.3414, icon: '🌿', description: 'Pointe de l\'Île de la Cité, vue 360° sur la Seine' },
    ],
    elevationGain: 18,
  },
  {
    id: 'panoramique-3',
    name: 'Montmartre & Buttes aux Cailles',
    description: 'Entre la Butte Montmartre et ses ruelles fleuries et les Buttes-aux-Cailles avec ses fresques murales. Le Paris alternatif et artistique.',
    type: 'panoramique',
    distance: 7.5,
    duration: 38,
    difficulty: 'Moyen',
    score: 88,
    scoreLabel: 'Points d\'intérêt',
    color: '#f59e0b',
    tags: ['Art', 'Fresques', 'Vignes', 'Vues panoramiques'],
    waypoints: [
      [48.8867, 2.3431], // Sacré-Cœur
      [48.8855, 2.3415],
      [48.8848, 2.3400],
      [48.8842, 2.3428], // Place du Tertre
      [48.8848, 2.3457],
      [48.8840, 2.3490],
      [48.8820, 2.3470], // Vignes de Montmartre
      [48.8806, 2.3450],
      [48.8790, 2.3430],
      [48.8760, 2.3410],
    ],
    pois: [
      { name: 'Sacré-Cœur', lat: 48.8867, lng: 2.3431, icon: '⛪', description: 'Vue panoramique sur tout Paris depuis le parvis' },
      { name: 'Place du Tertre', lat: 48.8847, lng: 2.3407, icon: '🎨', description: 'Peintres de rue, ambiance village bohème' },
      { name: 'Vignes de Montmartre', lat: 48.8847, lng: 2.3464, icon: '🍇', description: 'Seuls vignobles de Paris, vendange en octobre' },
      { name: 'Moulin de la Galette', lat: 48.8839, lng: 2.3382, icon: '🎠', description: 'Vieux moulin peint par Renoir' },
    ],
    elevationGain: 95,
  },
  {
    id: 'panoramique-4',
    name: 'Les Marchés & Trésors Cachés',
    description: 'Marchés aux fleurs, passages couverts, places secrètes. Le Paris authentique loin des guides touristiques.',
    type: 'panoramique',
    distance: 5.2,
    duration: 28,
    difficulty: 'Facile',
    score: 90,
    scoreLabel: 'Points d\'intérêt',
    color: '#ec4899',
    tags: ['Marchés', 'Passages', 'Secret', 'Fleurs'],
    waypoints: [
      [48.8538, 2.3457], // Marché aux Fleurs
      [48.8548, 2.3460],
      [48.8562, 2.3469],
      [48.8576, 2.3476],
      [48.8598, 2.3490], // Passage Jouffroy
      [48.8620, 2.3487], // Passage Brady
      [48.8635, 2.3482],
      [48.8643, 2.3475], // Marché Saint-Martin
      [48.8657, 2.3462],
    ],
    pois: [
      { name: 'Marché aux Fleurs Reine Elisabeth II', lat: 48.8538, lng: 2.3457, icon: '🌺', description: 'Plus ancien marché de Paris, orchidées et plantes rares' },
      { name: 'Passage Jouffroy', lat: 48.8719, lng: 2.3470, icon: '🏛️', description: 'Galerie couverte du XIXe, antiquaires et jouets' },
      { name: 'Passage Brady', lat: 48.8671, lng: 2.3543, icon: '🌶️', description: 'Passage indien, épices et couleurs' },
      { name: 'Marché couvert Saint-Martin', lat: 48.8699, lng: 2.3636, icon: '🥖', description: 'Halle historique, produits frais et locaux' },
    ],
    elevationGain: 12,
  },
]

export function getRoutesByType(type: string): ScootRoute[] {
  return ALL_ROUTES.filter(r => r.type === type)
}

export function getRouteById(id: string): ScootRoute | undefined {
  return ALL_ROUTES.find(r => r.id === id)
}
