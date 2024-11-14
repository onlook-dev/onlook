import { postRun, preRun } from '../run';

export async function listenForRunMessages() {
    console.log('listenForRunMessages');
    preRun();
    postRun();
}
