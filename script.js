// Array of audio file URLs
const audioFiles = [
 "https://www.djspeedsick.com/files/aud/0DDE9002290A4E4B24ED7A3762742882.mp3",
    "https://www.djspeedsick.com/files/aud/EEBD631AAAA8C8C9B3DD09DA1A4FD837.mp3",
    "https://www.djspeedsick.com/files/aud/87D11F507509CDCD6510E9B4EB36D766.mp3",
    "https://www.djspeedsick.com/files/aud/CFA3A3216F9E2814585A7D133F44F80C.mp3",
    "https://www.djspeedsick.com/files/aud/317D2E7B4AC8260CC6C619AC1FF3608C.mp3",
    "https://www.djspeedsick.com/files/aud/39E0EE37FA1E5C181E12A468DE1FCBF3.mp3",
    "https://www.djspeedsick.com/files/aud/FE739E5D62BBEE2652FA0B53231AA333.mp3"  
];
// Function to get a random audio file from the array
function getRandomAudio() {
    const randomIndex = Math.floor(Math.random() * audioFiles.length);
    return audioFiles[randomIndex];
}

// Get the audio player element
const audioPlayer = document.getElementById('audioPlayer');

// Function to play a random audio track
function playRandomTrack() {
    audioPlayer.src = getRandomAudio();
    audioPlayer.play().catch(error => {
        console.error("Autoplay was prevented: ", error);
    });
}

// Set an initial random audio file as the source and play it
playRandomTrack();

const playButton = document.getElementById("play-button");
const pauseButton = document.getElementById("pause-button");
const nextButton = document.getElementById("next-button");

playButton.addEventListener("click", () => {
    audioPlayer.play();
});

pauseButton.addEventListener("click", () => {
    audioPlayer.pause();
});

nextButton.addEventListener("click", () => {
    playRandomTrack();

document.getElementById('play-button').addEventListener('click', function() {
  document.getElementById('audioPlayer').play();
});

document.getElementById('pause-button').addEventListener('click', function() {
  document.getElementById('audioPlayer').pause();
});

document.getElementById('next-button').addEventListener('click', function() {
  // Assuming next song functionality is implemented
  playNextSong();
});


});