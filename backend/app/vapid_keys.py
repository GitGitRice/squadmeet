"""Generate URL-safe base64 VAPID keys for SCRUM-44 setup."""

import base64

from py_vapid import Vapid


def encoded(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode()


def generate_pair() -> tuple[str, str]:
    vapid = Vapid()
    vapid.generate_keys()
    private = vapid.private_key.private_numbers().private_value.to_bytes(32, "big")
    public = vapid.public_key.public_numbers()
    point = b"\x04" + public.x.to_bytes(32, "big") + public.y.to_bytes(32, "big")
    return encoded(private), encoded(point)


if __name__ == "__main__":
    private_key, public_key = generate_pair()
    print(f"VAPID_PRIVATE_KEY={private_key}")
    print(f"VAPID_PUBLIC_KEY={public_key}")
