using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Microsoft.AspNet.SignalR;
using System.Collections.Concurrent;
using Microsoft.AspNet.SignalR.Hubs;
using System.Threading.Tasks;

namespace WebApplication5.Models
{
    public class UserConnectionData
    {
        public String connectionId { get; set; }
        public String user_id { get; set; }
        public string meeting_id { get; set; }
    }
    public class WebRtcHub : Hub
    {
        public static List<UserConnectionData> _userConnections = new List<UserConnectionData>();

        public Object Connect(String user_id,String meetingid)
        {
            var obj = _userConnections.Where(p => p.user_id == user_id && p.meeting_id == meetingid).FirstOrDefault();
            if(obj != null)
            {
                obj.connectionId = Context.ConnectionId;
            }
            else
            {
                _userConnections.Add(new UserConnectionData() { 
                    meeting_id = meetingid,
                    user_id = user_id,
                    connectionId = Context.ConnectionId
                });
            }
            var other_user = _userConnections.Where(p => p.meeting_id == meetingid && p.user_id != user_id).FirstOrDefault();
            if(other_user != null)
            {
                Clients.Client(other_user.connectionId).informAboutUsers(user_id);
                return other_user;
            }

            return null;
            //var users = list.Select(p => p.user_id).ToList();
            //foreach (var v in list)
            //{
            //    Clients.Client(v.connectionId).informAboutUsers(users);
            //}
        }
        public override Task OnDisconnected(bool stopCalled)
        {
            var connectionId = Context.ConnectionId;
            var meeting_id = _userConnections.Where(p => p.connectionId == connectionId).Select(p => p.meeting_id).FirstOrDefault();

            _userConnections.RemoveAll(p => p.connectionId == connectionId);
            var list = _userConnections.Where(p => p.meeting_id == meeting_id).ToList();
            var users = list.Select(p => p.user_id).ToList();
            foreach (var v in list)
            {
                Clients.Client(v.connectionId).informAboutUsers(users);
            }

            return base.OnDisconnected(stopCalled);
        }
        public void Send(string message)
        {
            var connectionId = Context.ConnectionId;
            var connObj = _userConnections.Where(p => p.connectionId == connectionId).FirstOrDefault();

            var list = _userConnections.Where(p => p.meeting_id == connObj.meeting_id && p.user_id != connObj.user_id).ToList();
            foreach (var v in list)
            {
                Clients.Client(v.connectionId).newMessage(message);
            }
        }

        public void userLeft()
        {
            var connectionId = Context.ConnectionId;
            var meeting_id = _userConnections.Where(p => p.connectionId == connectionId).Select(p => p.meeting_id).FirstOrDefault();

            _userConnections.RemoveAll(p => p.connectionId == connectionId);
            var list = _userConnections.Where(p => p.meeting_id == meeting_id).ToList();
            var users = list.Select(p => p.user_id).ToList();
            foreach (var v in list)
            {
                Clients.Client(v.connectionId).otherUserLeft();
            }

        }
    }
}