export interface Speaker {
  id: string;
  name: string;
  /** art actor id for the portrait */
  actor: string;
  color: string;
}

const S = (id: string, name: string, actor: string, color: string): [string, Speaker] => [id, { id, name, actor, color }];

export const SPEAKERS: Record<string, Speaker> = Object.fromEntries([
  S('trunks', 'Trunks', 'trunks-base', '#95a8f5'),
  S('goku', 'Goku', 'goku-base', '#f09048'),
  S('gohan', 'Gohan', 'gohan-base', '#b59af1'),
  S('vegeta', 'Vegeta', 'vegeta-base', '#f2ce55'),
  S('piccolo', 'Piccolo', 'piccolo-base', '#72b878'),
  S('krillin', 'Krillin', 'krillin-base', '#eecb97'),
  S('tien', 'Tien', 'tien-base', '#a4d4c5'),
  S('bulma', 'Bulma', 'bulma', '#52c6c0'),
  S('chichi', 'Chi-Chi', 'chi-chi', '#d9483b'),
  S('yamcha', 'Yamcha', 'yamcha', '#e08a2b'),
  S('kami', 'Kami', 'kami', '#4fa35b'),
  S('kingkai', 'King Kai', 'king-kai', '#4b78d6'),
  S('satan', 'Mr. Satan', 'mr-satan', '#e8e3d0'),
  S('gero', 'Dr. Gero', 'android-20', '#bba98a'),
  S('a19', 'Android 19', 'android-19', '#d9c9d9'),
  S('a17', 'Android 17', 'android-17', '#7aa7d9'),
  S('a18', 'Android 18', 'android-18', '#e9d56b'),
  S('a16', 'Android 16', 'android-16', '#7b9b5b'),
  S('cell', 'Cell', 'cell-perfect', '#5aa24a'),
  S('cell1', 'Cell', 'cell-imperfect', '#7ab05a'),
  S('cell2', 'Cell', 'cell-semi-perfect', '#6aa850'),
  S('cellsp', 'Cell', 'cell-super-perfect', '#c9b83b'),
  S('frieza', 'Mecha Frieza', 'mecha-frieza', '#b06ad9'),
  S('cold', 'King Cold', 'king-cold', '#9a73c9'),
  S('researcher', 'Researcher', 'researcher', '#d9d9d9'),
  S('civilian', 'Civilian', 'civilian', '#c9a98a'),
  S('narrator', '', 'narrator', '#aaaaaa'),
]);

export const speakerOf = (id: string): Speaker => SPEAKERS[id] ?? SPEAKERS.narrator;
