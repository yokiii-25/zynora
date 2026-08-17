import time
import torch


def main() -> None:
    print("=" * 55)
    print("ZYNORA GPU CHECK")
    print("=" * 55)

    print(f"PyTorch version : {torch.__version__}")
    print(f"CUDA available  : {torch.cuda.is_available()}")
    print(f"CUDA runtime    : {torch.version.cuda}")

    if not torch.cuda.is_available():
        raise RuntimeError(
            "CUDA is unavailable. A CUDA-enabled PyTorch build is required."
        )

    device = torch.device("cuda")
    properties = torch.cuda.get_device_properties(device)

    print(f"GPU             : {properties.name}")
    print(f"Total VRAM      : {properties.total_memory / 1024**3:.2f} GB")

    # Moderate matrix size suitable for a 4 GB GPU.
    matrix_size = 4096

    print(f"\nCreating {matrix_size} x {matrix_size} tensors...")

    first = torch.randn(
        matrix_size,
        matrix_size,
        device=device,
        dtype=torch.float16,
    )
    second = torch.randn(
        matrix_size,
        matrix_size,
        device=device,
        dtype=torch.float16,
    )

    # Warm-up CUDA before measuring.
    for _ in range(3):
        _ = first @ second

    torch.cuda.synchronize()

    start = time.perf_counter()

    iterations = 10
    for _ in range(iterations):
        result = first @ second

    torch.cuda.synchronize()
    elapsed = time.perf_counter() - start

    allocated = torch.cuda.memory_allocated() / 1024**2
    reserved = torch.cuda.memory_reserved() / 1024**2

    print("\nGPU benchmark completed successfully.")
    print(f"Iterations      : {iterations}")
    print(f"Elapsed time    : {elapsed:.3f} seconds")
    print(f"Average         : {elapsed / iterations:.3f} seconds")
    print(f"Allocated VRAM  : {allocated:.1f} MB")
    print(f"Reserved VRAM   : {reserved:.1f} MB")
    print(f"Result shape    : {tuple(result.shape)}")


if __name__ == "__main__":
    main()