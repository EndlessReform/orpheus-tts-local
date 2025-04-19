from snac import SNAC
import numpy as np
import torch

TOKENS_PER_FRAME = 7


def get_device():
    return (
        "cuda"
        if torch.cuda.is_available()
        else "mps"
        if torch.backends.mps.is_available()
        else "cpu"
    )


model = SNAC.from_pretrained("hubertsiuzdak/snac_24khz").eval()

device = get_device()
print(f"Using device: {device}")
model = model.to(device)


def convert_to_audio(multiframe):
    if len(multiframe) < TOKENS_PER_FRAME:
        return

    codes_0 = torch.tensor([], device=device, dtype=torch.int32)
    codes_1 = torch.tensor([], device=device, dtype=torch.int32)
    codes_2 = torch.tensor([], device=device, dtype=torch.int32)

    num_frames = len(multiframe) // TOKENS_PER_FRAME
    frame = multiframe[: num_frames * TOKENS_PER_FRAME]

    for j in range(num_frames):
        i = TOKENS_PER_FRAME * j
        if codes_0.shape[0] == 0:
            codes_0 = torch.tensor([frame[i]], device=device, dtype=torch.int32)
        else:
            codes_0 = torch.cat(
                [codes_0, torch.tensor([frame[i]], device=device, dtype=torch.int32)]
            )

        if codes_1.shape[0] == 0:
            codes_1 = torch.tensor([frame[i + 1]], device=device, dtype=torch.int32)
            codes_1 = torch.cat(
                [
                    codes_1,
                    torch.tensor([frame[i + 4]], device=device, dtype=torch.int32),
                ]
            )
        else:
            codes_1 = torch.cat(
                [
                    codes_1,
                    torch.tensor([frame[i + 1]], device=device, dtype=torch.int32),
                ]
            )
            codes_1 = torch.cat(
                [
                    codes_1,
                    torch.tensor([frame[i + 4]], device=device, dtype=torch.int32),
                ]
            )

        if codes_2.shape[0] == 0:
            codes_2 = torch.tensor([frame[i + 2]], device=device, dtype=torch.int32)
            codes_2 = torch.cat(
                [
                    codes_2,
                    torch.tensor([frame[i + 3]], device=device, dtype=torch.int32),
                ]
            )
            codes_2 = torch.cat(
                [
                    codes_2,
                    torch.tensor([frame[i + 5]], device=device, dtype=torch.int32),
                ]
            )
            codes_2 = torch.cat(
                [
                    codes_2,
                    torch.tensor([frame[i + 6]], device=device, dtype=torch.int32),
                ]
            )
        else:
            codes_2 = torch.cat(
                [
                    codes_2,
                    torch.tensor([frame[i + 2]], device=device, dtype=torch.int32),
                ]
            )
            codes_2 = torch.cat(
                [
                    codes_2,
                    torch.tensor([frame[i + 3]], device=device, dtype=torch.int32),
                ]
            )
            codes_2 = torch.cat(
                [
                    codes_2,
                    torch.tensor([frame[i + 5]], device=device, dtype=torch.int32),
                ]
            )
            codes_2 = torch.cat(
                [
                    codes_2,
                    torch.tensor([frame[i + 6]], device=device, dtype=torch.int32),
                ]
            )

    codes = [codes_0.unsqueeze(0), codes_1.unsqueeze(0), codes_2.unsqueeze(0)]
    # check that all tokens are between 0 and 4096 otherwise return *
    if (
        torch.any(codes[0] < 0)
        or torch.any(codes[0] > 4096)
        or torch.any(codes[1] < 0)
        or torch.any(codes[1] > 4096)
        or torch.any(codes[2] < 0)
        or torch.any(codes[2] > 4096)
    ):
        return

    with torch.inference_mode():
        audio_hat = model.decode(codes)

    audio_slice = audio_hat[:, :, 2048:4096]
    detached_audio = audio_slice.detach().cpu()
    audio_np = detached_audio.numpy()
    audio_int16 = (audio_np * 32767).astype(np.int16)
    audio_bytes = audio_int16.tobytes()
    return audio_bytes


def turn_token_into_id(token_string, index):
    # Strip whitespace
    token_string = token_string.strip()

    # Find the last token in the string
    last_token_start = token_string.rfind("<custom_token_")

    if last_token_start == -1:
        return None

    # Extract the last token
    last_token = token_string[last_token_start:]

    # Process the last token
    if last_token.startswith("<custom_token_") and last_token.endswith(">"):
        try:
            number_str = last_token[14:-1]
            return int(number_str) - 10 - ((index % TOKENS_PER_FRAME) * 4096)
        except ValueError:
            return None
    else:
        return None
