import * as Tone from 'tone';

export const playNotificationSound = async () => {
  try {
    if (Tone.context.state !== 'running') {
      console.warn("Tone.js audio context is not running. Attempting to start...");
      try {
          await Tone.start();
          console.log('Tone.js audio context started.');
      } catch (startError) {
           console.error("Failed to start Tone.js audio context automatically. User interaction might be required.", startError);
      }
    }

    const synth = new Tone.Synth().toDestination();
    synth.triggerAttackRelease("C5", "8n", Tone.now());
    console.log("Notification sound played via Tone.js.");

    setTimeout(() => {
        if (synth && !synth.disposed) {
            synth.dispose();
        }
    }, 500);

  } catch (error) {
    console.error("Ovoz chalishda xatolik:", error);
  }
};

