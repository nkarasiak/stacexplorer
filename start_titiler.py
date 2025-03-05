#!/usr/bin/env python
"""
Simple script to start a TiTiler server
"""
import uvicorn
from titiler.application import app

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 