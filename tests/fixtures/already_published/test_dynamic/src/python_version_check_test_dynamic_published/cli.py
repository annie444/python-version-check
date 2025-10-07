import rich_click as click
from rich import print


__all__ = ["main"]


@click.command()
def main() -> None:
    print("Hello from python-version-check-test-dynamic-published!")
