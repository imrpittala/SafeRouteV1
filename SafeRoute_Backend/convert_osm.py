import osmium as o
import sys

class Converter(o.SimpleHandler):
    def __init__(self, writer):
        super().__init__()
        self.writer = writer
    def node(self, n):
        self.writer.add_node(n)
    def way(self, w):
        self.writer.add_way(w)
    def relation(self, r):
        self.writer.add_relation(r)

writer = o.SimpleWriter("custom_data/hyderabad.osm.pbf")
handler = Converter(writer)
handler.apply_file("custom_data/hyderabad.osm")
writer.close()
