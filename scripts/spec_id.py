#!/usr/bin/env python3
"""Genera un id8 hex único estilo git para nombres de change."""
import secrets

print(secrets.token_hex(4))
