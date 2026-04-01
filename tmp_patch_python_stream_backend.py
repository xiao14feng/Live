from pathlib import Path

p = Path(r'd:\Desktop\project\live-debate-backend\app\services\live_service.py')
s = p.read_text(encoding='utf-8')
s = s.replace("""    def update_stream(
        self,
        db: Session,
        stream_id: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        cover_url: Optional[str] = None,
        debate_id: Optional[str] = None,
        host_name: Optional[str] = None,
    ) -> Optional[Stream]:""", """    def update_stream(
        self,
        db: Session,
        stream_id: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        cover_url: Optional[str] = None,
        debate_id: Optional[str] = None,
        host_name: Optional[str] = None,
        type: Optional[str] = None,
        url: Optional[str] = None,
        enabled: Optional[bool] = None,
    ) -> Optional[Stream]:""")
s = s.replace("""        if host_name is not None:
            stream.host_name = host_name
        db.commit()""", """        if host_name is not None:
            stream.host_name = host_name
        if type is not None:
            stream.type = type
        if url is not None:
            stream.url = url
        if enabled is not None:
            stream.enabled = enabled
        db.commit()""")
p.write_text(s, encoding='utf-8')

p2 = Path(r'd:\Desktop\project\live-debate-backend\app\api\streams.py')
s2 = p2.read_text(encoding='utf-8')
s2 = s2.replace("""    stream = live_service.update_stream(
        db,
        stream_id,
        title=body.get(\"title\"),
        description=body.get(\"description\"),
        cover_url=body.get(\"coverUrl\") or body.get(\"cover_url\"),
        debate_id=body.get(\"debateId\") or body.get(\"debate_id\"),
        host_name=body.get(\"hostName\") or body.get(\"host_name\"),
    )""", """    stream = live_service.update_stream(
        db,
        stream_id,
        title=body.get(\"title\") or body.get(\"name\"),
        description=body.get(\"description\"),
        cover_url=body.get(\"coverUrl\") or body.get(\"cover_url\"),
        debate_id=body.get(\"debateId\") or body.get(\"debate_id\"),
        host_name=body.get(\"hostName\") or body.get(\"host_name\"),
        type=body.get(\"type\"),
        url=body.get(\"url\") or body.get(\"streamUrl\") or body.get(\"stream_url\"),
        enabled=body.get(\"enabled\"),
    )""")
p2.write_text(s2, encoding='utf-8')
print('patched-python-stream-backend')
