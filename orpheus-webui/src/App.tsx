import { useState } from 'react';
import OpenAI from 'openai';
import { playAudio } from 'openai/helpers/audio'; // Helper for easy playback

// Import ShadCN components
import { Button } from "@/components/ui/button"; // Adjust path if needed
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { WavStreamPlayer } from "wavtools";

// --- OpenAI Client Setup ---
// IMPORTANT: Handle your API key securely!
// Using environment variables (VITE_*) is common for Vite projects during development.
// For production, use a backend proxy.
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // **Required** for frontend usage, acknowledges security risks
});

// --- Voice Options ---
const voices = ['ash', 'ballad', 'coral', 'sage', 'verse'];
const defaultVoice = 'coral';
const defaultInstructions = "Voice Affect: Calm, composed, and reassuring. Competent and in control, instilling trust.\n\nTone: Sincere, empathetic, with genuine concern for the customer and understanding of the situation.\n\nPacing: Slower during the apology to allow for clarity and processing. Faster when offering solutions to signal action and resolution.\n\nEmotions: Calm reassurance, empathy, and gratitude.\n\nPronunciation: Clear, precise: Ensures clarity, especially with key details. Focus on key words like \"refund\" and \"patience.\" \n\nPauses: Before and after the apology to give space for processing the apology.";
const defaultInputText = "Thank you for reaching out, and I'm truly sorry about the unexpected charge on your bill. I completely understand how frustrating this must be, especially after your stay.\n\nAfter reviewing your reservation, I can confirm that this was an error on our part. I'll be issuing a full refund right away, and you should see the amount credited to your payment method within a few business days.\n\nI appreciate your understanding and patience, and I'm here if you need any further assistance. Thank you for allowing us to resolve this for you.";

function App() {
  const [selectedVoice, setSelectedVoice] = useState(defaultVoice);
  const [instructions, setInstructions] = useState(defaultInstructions);
  const [inputText, setInputText] = useState(defaultInputText);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null); // To potentially stop previous audio

  const handleGenerateAudio = async () => {
    if (!inputText.trim()) {
      setError("Please enter some text to synthesize.");
      return;
    }
    if (!openai.apiKey) {
      setError("OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your .env file.");
      return;
    }


    setIsLoading(true);
    setError(null);

    // Stop any currently playing audio
    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
      setAudioPlayer(null);
    }


    try {
      console.log('Sending request to OpenAI with:', {
        model: 'gpt-4o-mini-tts', // Or use 'tts-1' / 'tts-1-hd' if needed
        voice: selectedVoice,
        input: inputText,
        instructions: instructions.trim() ? instructions : undefined, // Only send if not empty
      });

      const response = await openai.audio.speech.create({
        model: 'gpt-4o-mini-tts', // You can change the model here
        voice: selectedVoice,
        input: inputText,
        // Only include instructions if the textarea is not empty
        ...(instructions.trim() && { instructions: instructions }),
      });

      // Use the playAudio helper
      // playAudio returns the HTMLAudioElement it creates
      const player = await playAudio(response);
      setAudioPlayer(player); // Store the player instance
      player.onended = () => setAudioPlayer(null); // Clear when finished

    } catch (err) {
      console.error("Error generating speech:", err);
      setError(err.message || "An unknown error occurred during audio generation.");
      // Try to parse more specific OpenAI error messages if available
      if (err.response && err.response.data && err.response.data.error) {
        setError(`OpenAI Error: ${err.response.data.error.message}`);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("An unknown error occurred during audio generation.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold mb-6 text-center">OpenAI TTS Generator</h1>

      {/* Voice Selection */}
      <div className="space-y-2">
        <Label className="text-lg font-semibold">Voice</Label>
        <RadioGroup
          value={selectedVoice}
          onValueChange={setSelectedVoice}
          className="flex flex-wrap gap-4"
        >
          {voices.map((voice) => (
            <div key={voice} className="flex items-center space-x-2">
              <RadioGroupItem value={voice} id={`voice-${voice}`} />
              <Label htmlFor={`voice-${voice}`} className="capitalize cursor-pointer">
                {voice}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Instructions (System Prompt) */}
      <div className="space-y-2">
        <Label htmlFor="instructions-input" className="text-lg font-semibold">
          Instructions (Optional)
        </Label>
        <Textarea
          id="instructions-input"
          placeholder="Enter voice instructions (affect, tone, pacing...)"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={6}
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Describe the desired voice characteristics (e.g., tone, emotion, pacing). Only used with gpt-4o-mini-tts model.
        </p>
      </div>

      {/* Text Input */}
      <div className="space-y-2">
        <Label htmlFor="text-input" className="text-lg font-semibold">
          Text to Synthesize
        </Label>
        <Textarea
          id="text-input"
          placeholder="Enter the text you want to convert to speech..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={8}
          required
        />
      </div>

      {/* Generate Button & Status */}
      <div className="flex flex-col items-center space-y-3">
        <Button
          onClick={handleGenerateAudio}
          disabled={isLoading || !inputText.trim()}
          className="w-full sm:w-auto px-8 py-3 text-lg" // Make button larger
        >
          {isLoading ? 'Generating...' : 'Generate & Play Audio'}
        </Button>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        {isLoading && <p className="text-blue-600 text-sm mt-2">Synthesizing audio, please wait...</p>}
      </div>
    </div>
  );
}

export default App;